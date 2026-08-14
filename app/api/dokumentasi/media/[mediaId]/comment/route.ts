import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { mediaId } = await params;
    const discordId = session.user.discordId;
    
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    // Get user uuid
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("discord_id", discordId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userId = dbUser.id;

    // Insert Comment
    const { data: comment, error: insertError } = await supabase
      .from("dokumentasi_comments")
      .insert({
        media_id: mediaId,
        user_id: userId,
        content: content.trim()
      })
      .select(`
        id, content, created_at,
        author:user_id ( full_name, username, avatar_url )
      `)
      .single();

    if (insertError) throw insertError;

    // Send notification
    const { data: mediaData } = await supabase.from("dokumentasi_media").select("user_id, event_id").eq("id", mediaId).single();
    if (mediaData && mediaData.user_id !== userId) {
      await supabase.from("notifications").insert({
        recipient_id: mediaData.user_id,
        actor_id: userId,
        type: "comment_post",
        reference_id: mediaData.event_id, // we can link to the event
        is_read: false
      });
    }

    return NextResponse.json({ success: true, comment });

  } catch (error: any) {
    console.error("Dokumentasi Comment Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
