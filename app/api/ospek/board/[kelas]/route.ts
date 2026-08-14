import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kelas: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const myId = session.user.discordId;
    const { kelas } = await params;
    
    // 1. Get all users in this kelas
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("discord_id, full_name, avatar_url, instagram")
      .eq("kelas", kelas);

    if (usersError) throw usersError;
    
    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, scans: [] });
    }

    // Filter out myself if I am in this class, because I can't scan myself
    const classDiscordIds = users.map(u => u.discord_id).filter(id => id !== myId);
    
    if (classDiscordIds.length === 0) {
      return NextResponse.json({ success: true, scans: [] });
    }

    // 2. Get all scans where I am involved AND the other person is in this class
    // (I am scanner AND scanned is in class) OR (I am scanned AND scanner is in class)
    const { data: scans, error: scansError } = await supabase
      .from("ospek_scans")
      .select("id, scanner_id, scanned_id, photo_url, created_at")
      .or(`and(scanner_id.eq.${myId},scanned_id.in.(${classDiscordIds.join(",")})),and(scanned_id.eq.${myId},scanner_id.in.(${classDiscordIds.join(",")}))`)
      .order('created_at', { ascending: false });

    if (scansError) throw scansError;

    // 3. Collect ALL involved user IDs to fetch their info
    const allInvolvedIds = [...new Set(scans.flatMap(s => [s.scanner_id, s.scanned_id]))];
    
    let allUsersMap = new Map<string, any>();
    // Add the users we already have from the class
    users.forEach(u => allUsersMap.set(u.discord_id, u));
    
    // Fetch any missing users (e.g. myself, or if somehow missing)
    const missingIds = allInvolvedIds.filter(id => !allUsersMap.has(id));
    if (missingIds.length > 0) {
      const { data, error } = await supabase
        .from("users")
        .select("discord_id, full_name, avatar_url, prodi, instagram")
        .in("discord_id", missingIds);
        
      if (!error && data) {
        data.forEach(u => allUsersMap.set(u.discord_id, u));
      }
    }

    // 4. Format for frontend - show the FRIEND'S info primarily
    const formattedScans = scans.map(scan => {
      const isIScanner = scan.scanner_id === myId;
      const friendId = isIScanner ? scan.scanned_id : scan.scanner_id;
      
      const scanner = allUsersMap.get(scan.scanner_id);
      const scanned = allUsersMap.get(scan.scanned_id);
      const friend = allUsersMap.get(friendId);
      
      return {
        id: scan.id,
        // Optional: you can show both names, or just the friend's name. We'll show the friend's name for the thumbnail.
        name: `${scanner?.full_name || "?"} & ${scanned?.full_name || "?"}`,
        scannerName: scanner?.full_name || scan.scanner_id,
        scannedName: friend?.full_name || friendId, // In personal mode, this represents the friend!
        scannedIg: friend?.instagram || "",
        avatar: friend?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + friendId,
        prodi: friend?.prodi || "",
        photoUrl: scan.photo_url || "",
        createdAt: scan.created_at,
      };
    });

    return NextResponse.json({ success: true, scans: formattedScans });
  } catch (error) {
    console.error("Board Details API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
