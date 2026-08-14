import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const myId = session.user.discordId;

    // 1. Get all scans involving me
    const { data: scans, error: scansError } = await supabase
      .from("ospek_scans")
      .select("scanner_id, scanned_id")
      .or(`scanner_id.eq.${myId},scanned_id.eq.${myId}`);

    if (scansError) throw scansError;

    if (!scans || scans.length === 0) {
      return NextResponse.json({ success: true, boards: [], totalScanned: 0 });
    }

    // 2. Identify the "other person" (friend) in each scan
    // Use a Set to ensure unique friends (in case of duplicate scans somehow)
    const friendIds = new Set<string>();
    scans.forEach(scan => {
      const friendId = scan.scanner_id === myId ? scan.scanned_id : scan.scanner_id;
      if (friendId !== myId) {
        friendIds.add(friendId);
      }
    });

    if (friendIds.size === 0) {
      return NextResponse.json({ success: true, boards: [], totalScanned: 0 });
    }

    // 3. Fetch the kelas for all unique friends
    const { data: friends, error: friendsError } = await supabase
      .from("users")
      .select("discord_id, kelas")
      .in("discord_id", Array.from(friendIds))
      .not("kelas", "is", null);

    if (friendsError) throw friendsError;

    // 4. Count friends per kelas
    const classCount: Record<string, number> = {};
    friends.forEach(f => {
      if (f.kelas) {
        classCount[f.kelas] = (classCount[f.kelas] || 0) + 1;
      }
    });

    // 5. Convert to array and format for the frontend
    const boards = Object.entries(classCount).map(([kelas, count]) => ({
      id: kelas,
      name: kelas,
      count: count,
    }));

    // Sort by count descending
    boards.sort((a, b) => b.count - a.count);

    return NextResponse.json({ success: true, boards, totalScanned: friendIds.size });
  } catch (error) {
    console.error("Leaderboard API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
