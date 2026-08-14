import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { requesterId, eventId, action } = await req.json(); // action: "accept" | "reject"

    if (!requesterId || !eventId || !action) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    // Get event owner
    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: event } = await supabase.from("dokumentasi_events").select("user_id").eq("id", eventId).single();
    
    if (!event || event.user_id !== dbUser.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Update request status
    const status = action === "accept" ? "accepted" : "rejected";
    const { error: updateError } = await supabase
      .from("dokumentasi_upload_requests")
      .update({ status })
      .eq("event_id", eventId)
      .eq("requester_id", requesterId);

    if (updateError) throw updateError;

    // Send notification to the requester
    if (action === "accept") {
      await supabase.from("notifications").insert({
        recipient_id: requesterId,
        actor_id: dbUser.id,
        type: "upload_accept",
        reference_id: eventId,
        is_read: false
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("Upload Request PUT Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
