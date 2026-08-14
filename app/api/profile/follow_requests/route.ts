import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // Fetch pending requests where the current user is the target (following_id)
    const { data: requests, error } = await supabase
      .from("user_follows")
      .select(`
        follower_id,
        follower:follower_id(id, full_name, username, avatar_url),
        created_at
      `)
      .eq("following_id", dbUser.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    console.error("GET Follow Requests Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { followerId, action } = await req.json();
    if (!followerId || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
    if (!dbUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    if (action === "accept") {
      const { error } = await supabase
        .from("user_follows")
        .update({ status: "accepted" })
        .eq("follower_id", followerId)
        .eq("following_id", dbUser.id)
        .eq("status", "pending");

      if (error) throw error;
      
      // Also notify the follower that their request was accepted
      await supabase.from("notifications").insert({
        recipient_id: followerId,
        actor_id: dbUser.id,
        type: "follow_accept",
        reference_id: followerId
      });

    } else if (action === "reject") {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", dbUser.id)
        .eq("status", "pending");

      if (error) throw error;
    }

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    console.error("PUT Follow Requests Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
