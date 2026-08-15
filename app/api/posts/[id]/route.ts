import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Fetch post detail with author, likes, and comments
    const { data: post, error } = await supabase
      .from("posts")
      .select(`
        *,
        author:user_id ( id, full_name, username, avatar_url, prodi ),
        likes:post_likes ( id, user_id ),
        comments:post_comments (
          id, content, created_at, parent_id,
          user:user_id ( id, full_name, username, avatar_url )
        ),
        collaborator:collaborator_id ( id, full_name, username, avatar_url, prodi )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!post) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const session = await auth();
    let hasLiked = false;
    let isOwnPost = false;
    let followStatus = "none";
    let currentUserId = null;
    
    if (session?.user?.discordId) {
      if (post.likes) {
        hasLiked = post.likes.some((like: any) => like.user_id === session.user.discordId);
      }
      
      const { data: currentUser } = await supabase
        .from("users")
        .select("id")
        .eq("discord_id", session.user.discordId)
        .single();
        
      if (currentUser) {
        currentUserId = currentUser.id;
      }
        
      if (currentUser && post.author?.id) {
        isOwnPost = post.author.id === currentUser.id;

        if (!isOwnPost) {
          const { data: followData } = await supabase
            .from("user_follows")
            .select("status")
            .eq("follower_id", currentUser.id)
            .eq("following_id", post.author.id)
            .maybeSingle();
          if (followData) {
            followStatus = followData.status;
          }
        }
      }
    }

    return NextResponse.json({ success: true, post: { ...post, hasLiked, isOwnPost, followStatus, currentUserId } });
  } catch (error: any) {
    console.error("Post Detail GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE a post
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify ownership
    const { data: post } = await supabase
      .from("posts")
      .select("user_id, author:user_id ( discord_id )")
      .eq("id", id)
      .single();
      
    if (!post || (post.author as any)?.discord_id !== session.user.discordId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Delete post
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Post DELETE Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
