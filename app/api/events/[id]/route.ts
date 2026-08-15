import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const eventId = resolvedParams.id;
    const discordId = session.user.discordId;

    // First check if the event exists and belongs to the user
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("user_discord_id")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.user_discord_id !== discordId) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own events" }, { status: 403 });
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Supabase DELETE event error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const eventId = resolvedParams.id;
    const discordId = session.user.discordId;

    const body = await req.json();
    const { title, date, time, location, visibility } = body;

    if (!title || !date || !time || !location || !visibility) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // First check if the event exists and belongs to the user
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("user_discord_id")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.user_discord_id !== discordId) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own events" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("events")
      .update({
        title,
        date,
        time,
        location,
        visibility
      })
      .eq("id", eventId)
      .select();

    if (error) {
      console.error("Supabase PUT event error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("PUT event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
