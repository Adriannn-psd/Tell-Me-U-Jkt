import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(`
        *,
        actor:actor_id(id, full_name, username, avatar_url)
      `)
      .eq("recipient_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, notifications }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    console.error("Notifications GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // Mark all as read
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", dbUser.id)
      .eq("is_read", false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications PUT Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
