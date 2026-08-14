import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserClass } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { kelas } = body;

    if (!kelas || typeof kelas !== "string") {
      return NextResponse.json({ error: "Kelas tidak valid" }, { status: 400 });
    }

    const updatedUser = await updateUserClass(session.user.discordId, kelas);
    
    if (!updatedUser) {
      return NextResponse.json({ error: "Gagal menyimpan kelas" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update kelas error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
