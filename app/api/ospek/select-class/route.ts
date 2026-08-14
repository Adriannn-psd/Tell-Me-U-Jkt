import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { kelas, instagram } = await req.json();

    if (!kelas || kelas.trim() === "") {
      return NextResponse.json({ success: false, error: "Kelas wajib dipilih" }, { status: 400 });
    }

    const updateData: Record<string, string> = { kelas: kelas.trim() };
    if (instagram && instagram.trim() !== "") {
      updateData.instagram = instagram.trim().replace(/^@/, "");
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("discord_id", session.user.discordId);

    if (error) {
      console.error("Select class error:", error);
      return NextResponse.json({ success: false, error: "Gagal menyimpan kelas" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Select class API error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
