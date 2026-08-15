import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username: rawUsername } = await params;
    const username = decodeURIComponent(rawUsername);
    const session = await auth();

    // Fetch user details
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, username, avatar_url, prodi, kelas, is_private, instagram, bio, skills, is_verified")
      .eq("username", username)
      .single();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    let followStatus = "none";
    let isOwnProfile = false;
    let currentUserDbId = null;

    if (session?.user?.discordId) {
      // Get current user's UUID
      const { data: currentUser } = await supabase
        .from("users")
        .select("id")
        .eq("discord_id", session.user.discordId)
        .single();
        
      if (currentUser) {
        currentUserDbId = currentUser.id;
        isOwnProfile = currentUser.id === user.id;

        if (!isOwnProfile) {
          const { data: followRecord } = await supabase
            .from("user_follows")
            .select("status")
            .eq("follower_id", currentUser.id)
            .eq("following_id", user.id)
            .single();
            
          if (followRecord) {
            followStatus = followRecord.status;
          }
        }
      }
    }

    const canViewPosts = !user.is_private || isOwnProfile || followStatus === "accepted";

    // Fetch user's posts ONLY if they have permission
    let posts: any[] = [];
    if (canViewPosts) {
      const { data: fetchedPosts, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          author:user_id ( full_name, username, avatar_url, prodi ),
          collaborator:collaborator_id ( full_name, username, avatar_url, prodi ),
          likes:post_likes ( id ),
          comments:post_comments ( id )
        `)
        .or(`user_id.eq.${user.id},and(collaborator_id.eq.${user.id},collab_status.eq.accepted)`)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      posts = fetchedPosts;
    }

    // Fetch followers count (only accepted or null for legacy)
    const { count: followersCount } = await supabase
      .from("user_follows")
      .select("*", { count: 'exact', head: true })
      .eq("following_id", user.id)
      .or("status.eq.accepted,status.is.null");

    // Fetch following count (only accepted or null for legacy)
    const { count: followingCount } = await supabase
      .from("user_follows")
      .select("*", { count: 'exact', head: true })
      .eq("follower_id", user.id)
      .or("status.eq.accepted,status.is.null");

    // Format stats
    const stats = {
      karya: canViewPosts ? posts.length : 0, // optionally count from DB even if hidden
      followers: followersCount || 0,
      following: followingCount || 0
    };

    if (!canViewPosts) {
      delete user.instagram;
    }

    return NextResponse.json({
      success: true,
      profile: user,
      stats,
      posts,
      followStatus,
      isOwnProfile,
      canViewPosts
    });
  } catch (error: any) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
