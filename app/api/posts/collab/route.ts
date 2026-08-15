import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { postId, action } = await req.json();

    if (!postId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    // Get current user id
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("discord_id", session.user.discordId)
      .single();

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Check if user is the collaborator of the post
    const { data: post } = await supabase
      .from("posts")
      .select("id, collaborator_id, collab_status")
      .eq("id", postId)
      .single();

    if (!post || post.collaborator_id !== dbUser.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (action === 'accept') {
      await supabase
        .from("posts")
        .update({ collab_status: 'accepted' })
        .eq("id", postId);
    } else {
      // reject
      await supabase
        .from("posts")
        .update({ collaborator_id: null, collab_status: null })
        .eq("id", postId);
    }

    // Resolve related notifications (mark as read)
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("reference_id", postId)
      .eq("recipient_id", dbUser.id)
      .eq("type", "collab_request");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Collab PUT Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
