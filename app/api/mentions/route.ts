import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: me } = await supabase
      .from("users")
      .select("id")
      .eq("discord_id", session.user.discordId)
      .single();

    if (!me) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    // We want to fetch users that the current user is following or is followed by (friends)
    // For simplicity, we can fetch all accepted follows involving this user, then filter by query
    const { data: follows, error: followsError } = await supabase
      .from("user_follows")
      .select(`
        follower_id,
        following_id,
        follower:follower_id(id, username, full_name, avatar_url),
        following:following_id(id, username, full_name, avatar_url)
      `)
      .eq("status", "accepted")
      .or(`follower_id.eq.${me.id},following_id.eq.${me.id}`);

    if (followsError) throw followsError;

    // Extract unique friends/followers
    const usersMap = new Map();
    
    follows?.forEach(f => {
      const isFollower = f.follower_id === me.id;
      const otherUser = isFollower ? f.following : f.follower;
      
      // if it's an array for some reason (should be object)
      const u = Array.isArray(otherUser) ? otherUser[0] : otherUser;
      
      if (u && u.id && u.username) {
        usersMap.set(u.id, u);
      }
    });

    let users = Array.from(usersMap.values());

    // Client side filtering (simpler than complex postgrest joins)
    if (query.length > 0) {
      const q = query.toLowerCase();
      users = users.filter((u: any) => 
        (u.username && u.username.toLowerCase().includes(q)) || 
        (u.full_name && u.full_name.toLowerCase().includes(q))
      );
    }

    // Limit to 10 suggestions
    users = users.slice(0, 10);

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error: any) {
    console.error("Mentions API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
