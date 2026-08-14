import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function PUT(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fullName, isPrivate } = body;

    if (fullName !== undefined && (typeof fullName !== "string" || fullName.trim().length < 2)) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter" },
        { status: 400 }
      );
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (fullName !== undefined) updates.full_name = fullName.trim();
    if (isPrivate !== undefined) updates.is_private = isPrivate;

    const { data: updated, error } = await supabase
      .from("users")
      .update(updates)
      .eq("discord_id", session.user.discordId)
      .select()
      .single();

    if (!updated) {
      return NextResponse.json(
        { error: "Gagal menyimpan data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
