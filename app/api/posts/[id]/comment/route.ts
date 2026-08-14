import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const userId = session.user.discordId;

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content
      })
      .select(`
        id, content, created_at,
        user:user_id ( full_name, username, avatar_url )
      `)
      .single();

    if (error) throw error;

    // Get user DB ID
    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", userId).single();
    
    // Get post author
    const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();

    if (dbUser && post && dbUser.id !== post.user_id) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        sender_id: dbUser.id,
        type: "comment",
        post_id: postId,
        content: content,
        is_read: false
      });
    }

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error("Comment API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
