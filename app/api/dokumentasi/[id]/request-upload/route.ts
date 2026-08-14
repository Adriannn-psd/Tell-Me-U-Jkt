import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: eventId } = resolvedParams;

    // Get user
    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // Get event to find owner
    const { data: event } = await supabase.from("dokumentasi_events").select("user_id").eq("id", eventId).single();
    if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });

    // Prevent self-request
    if (event.user_id === dbUser.id) {
      return NextResponse.json({ success: false, error: "You are the owner" }, { status: 400 });
    }

    // Insert request
    const { data: request, error: requestError } = await supabase
      .from("dokumentasi_upload_requests")
      .insert({
        event_id: eventId,
        requester_id: dbUser.id,
        status: "pending"
      })
      .select()
      .single();

    if (requestError) {
      // Might be unique constraint violation if already requested
      return NextResponse.json({ success: false, error: "Already requested" }, { status: 400 });
    }

    // Insert notification to owner
    await supabase.from("notifications").insert({
      recipient_id: event.user_id,
      actor_id: dbUser.id,
      type: "upload_request",
      reference_id: eventId,
      is_read: false
    });

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    console.error("Request Upload API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
