import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const prodi = session.user.prodi || "";
    const kelas = session.user.kelas || "";

    // Build the OR query for visibility
    // 1. visibility = Semua
    // 2. user_discord_id = discordId
    // 3. visibility = Seprodi AND user_prodi = prodi
    // 4. visibility = Sekelas AND user_kelas = kelas

    let orQuery = `visibility.eq.Semua,user_discord_id.eq.${discordId}`;
    
    if (prodi) {
      orQuery += `,and(visibility.eq.Seprodi,user_prodi.eq.${prodi})`;
    }
    if (kelas) {
      orQuery += `,and(visibility.eq.Sekelas,user_kelas.eq.${kelas})`;
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .or(orQuery)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase GET events error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, date, time, location, visibility } = body;

    if (!title || !date || !time || !location || !visibility) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const discordId = session.user.discordId;
    const prodi = session.user.prodi || null;
    const kelas = session.user.kelas || null;

    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          title,
          date,
          time,
          location,
          visibility,
          user_discord_id: discordId,
          user_prodi: prodi,
          user_kelas: kelas,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase POST events error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("POST events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
