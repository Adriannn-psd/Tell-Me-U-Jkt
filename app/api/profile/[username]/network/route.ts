import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username: rawUsername } = await params;
    const username = decodeURIComponent(rawUsername);
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'followers' or 'following'

    if (!['followers', 'following'].includes(type as string)) {
      return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
    }

    // Get the target user
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, is_private")
      .eq("username", username)
      .single();

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Check privacy
    let isOwnProfile = false;
    let followStatus = "none";
    let currentUserId = null;

    if (session?.user?.discordId) {
      const { data: me } = await supabase
        .from("users")
        .select("id")
        .eq("discord_id", session.user.discordId)
        .single();
      
      if (me) {
        currentUserId = me.id;
        isOwnProfile = targetUser.id === me.id;

        if (!isOwnProfile) {
          const { data: followRecord } = await supabase
            .from("user_follows")
            .select("status")
            .eq("follower_id", currentUserId)
            .eq("following_id", targetUser.id)
            .single();
          
          if (followRecord) {
            followStatus = followRecord.status;
          }
        }
      }
    }

    const canViewNetwork = !targetUser.is_private || isOwnProfile || followStatus === "accepted";

    if (!canViewNetwork) {
      return NextResponse.json({ success: false, error: "Private profile" }, { status: 403 });
    }

    let users = [];

    if (type === 'followers') {
      const { data } = await supabase
        .from("user_follows")
        .select(`
          follower:follower_id(id, full_name, username, avatar_url, prodi)
        `)
        .eq("following_id", targetUser.id)
        .eq("status", "accepted");
      
      users = data?.map(d => d.follower) || [];
    } else {
      const { data } = await supabase
        .from("user_follows")
        .select(`
          following:following_id(id, full_name, username, avatar_url, prodi)
        `)
        .eq("follower_id", targetUser.id)
        .eq("status", "accepted");
      
      users = data?.map(d => d.following) || [];
    }

    // Optional: attach current user's follow status towards these users
    // If the client needs to show "Follow/Following" buttons inside the list
    if (currentUserId && users.length > 0) {
      const userIds = users.map((u: any) => u.id);
      const { data: myFollows } = await supabase
        .from("user_follows")
        .select("following_id, status")
        .eq("follower_id", currentUserId)
        .in("following_id", userIds);
      
      const followMap = Object.fromEntries(myFollows?.map(f => [f.following_id, f.status]) || []);
      
      users = users.map((u: any) => ({
        ...u,
        my_follow_status: currentUserId === u.id ? 'self' : (followMap[u.id] || 'none')
      }));
    } else {
      users = users.map((u: any) => ({ ...u, my_follow_status: 'none' }));
    }

    return NextResponse.json({ success: true, users });

  } catch (error: any) {
    console.error("Network API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
