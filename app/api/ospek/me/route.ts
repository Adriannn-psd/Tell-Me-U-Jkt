import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("users")
      .select("kelas, prodi, instagram")
      .eq("discord_id", session.user.discordId)
      .single();

    if (error) {
      console.error("Me API error:", error);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      kelas: data.kelas,
      prodi: data.prodi,
      instagram: data.instagram,
    });
  } catch (error) {
    console.error("Me API error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
