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

    const { content, parentId } = await req.json();
    if (!content) {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    // Extract mentions @username
    const mentions = content.match(/@([a-zA-Z0-9_.]+)/g);
    let mentionedUserIds: string[] = [];
    if (mentions) {
      const usernames = mentions.map((m: string) => m.substring(1));
      const { data: mentionedUsers } = await supabase.from("users").select("id").in("username", usernames);
      if (mentionedUsers) {
        mentionedUserIds = mentionedUsers.map(u => u.id);
      }
    }

    // Get user DB ID
    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", userId).single();
    if (!dbUser) throw new Error("User not found");

    const { data: comment, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        parent_id: parentId || null
      })
      .select(`
        id, content, created_at, parent_id,
        user:user_id ( id, full_name, username, avatar_url )
      `)
      .single();

    if (error) {
      console.error("Comment Insert Error:", error);
      throw error;
    }

    // Send notifications
    const notificationsToInsert = [];
    
    // 1. Post author notification (if not replying and not the author)
    const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
    
    if (!parentId && post && dbUser.id !== post.user_id && !mentionedUserIds.includes(post.user_id)) {
      notificationsToInsert.push({
        recipient_id: post.user_id,
        actor_id: dbUser.id,
        type: "comment",
        reference_id: postId,
        is_read: false
      });
    }

    // 2. Parent comment author notification (if it's a reply)
    if (parentId) {
      const { data: parentComment } = await supabase.from("post_comments").select("user_id").eq("id", parentId).single();
      if (parentComment && parentComment.user_id !== dbUser.id && !mentionedUserIds.includes(parentComment.user_id)) {
        notificationsToInsert.push({
          recipient_id: parentComment.user_id,
          actor_id: dbUser.id,
          type: "reply",
          reference_id: postId,
          is_read: false
        });
      }
    }

    // 3. Mention notifications
    for (const mId of mentionedUserIds) {
      if (mId !== dbUser.id) {
        notificationsToInsert.push({
          recipient_id: mId,
          actor_id: dbUser.id,
          type: "mention",
          reference_id: postId,
          is_read: false
        });
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: notifError } = await supabase.from("notifications").insert(notificationsToInsert);
      if (notifError) {
        console.error("Notification Insert Error:", notifError);
      }
    }

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error("Comment API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
