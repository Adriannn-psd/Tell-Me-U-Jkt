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
    const { action } = await req.json(); // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // Verify the post and that the user is the collaborator
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("user_id, collaborator_id, collab_status")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    if (post.collaborator_id !== dbUser.id) {
      return NextResponse.json({ success: false, error: "Not authorized as collaborator" }, { status: 403 });
    }

    if (post.collab_status !== 'pending') {
      return NextResponse.json({ success: false, error: "Collab request already processed" }, { status: 400 });
    }

    // Update status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    const { error: updateError } = await supabase
      .from("posts")
      .update({ collab_status: newStatus })
      .eq("id", postId);

    if (updateError) throw updateError;

    // Send notification back to post author
    if (action === 'accept') {
      await supabase.from("notifications").insert({
        recipient_id: post.user_id,
        actor_id: dbUser.id,
        type: "collab_accept",
        reference_id: postId,
        is_read: false
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error("Collab API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
