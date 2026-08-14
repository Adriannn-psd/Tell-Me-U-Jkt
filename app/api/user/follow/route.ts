import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId, action } = await req.json();

    if (!targetUserId || !["follow", "unfollow"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    // Get current user's DB ID
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("discord_id", session.user.discordId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const currentUserId = dbUser.id;

    if (currentUserId === targetUserId) {
      return NextResponse.json({ success: false, error: "Cannot follow yourself" }, { status: 400 });
    }

    if (action === "follow") {
      // Get target user privacy
      const { data: targetUser } = await supabase
        .from("users")
        .select("is_private")
        .eq("id", targetUserId)
        .single();
        
      const status = targetUser?.is_private ? "pending" : "accepted";

      const { data: existing, error: existError } = await supabase
        .from("user_follows")
        .select("status")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .maybeSingle();
      
      if (!existing) {
        const { error } = await supabase
          .from("user_follows")
          .insert({
            follower_id: currentUserId,
            following_id: targetUserId,
            status
          });

        if (error && error.code !== '23505') throw error;
        
        // Create notification
        await supabase.from("notifications").insert({
          recipient_id: targetUserId,
          actor_id: currentUserId,
          type: status === "pending" ? "follow_request" : "follow",
          reference_id: targetUserId,
          is_read: false
        });
      }
      return NextResponse.json({ success: true, action: "follow", status });
    } else if (action === "unfollow") {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .match({
          follower_id: currentUserId,
          following_id: targetUserId
        });
        
      if (error) throw error;
      return NextResponse.json({ success: true, action: "unfollow", status: "none" });
    }

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    console.error("Follow API Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
