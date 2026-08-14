import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserInstagram } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { instagram } = body;

    if (!instagram || typeof instagram !== "string") {
      return NextResponse.json({ error: "Username Instagram tidak valid" }, { status: 400 });
    }

    // Cleaning up the username (remove @, spaces, full urls)
    instagram = instagram.trim();
    if (instagram.includes("instagram.com/")) {
      const parts = instagram.split("instagram.com/");
      instagram = parts[parts.length - 1].split("/")[0].split("?")[0];
    }
    if (instagram.startsWith("@")) {
      instagram = instagram.substring(1);
    }
    instagram = instagram.replace(/\s+/g, "");

    const updatedUser = await updateUserInstagram(session.user.discordId, instagram);
    
    if (!updatedUser) {
      return NextResponse.json({ error: "Gagal menyimpan Instagram" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update instagram error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
