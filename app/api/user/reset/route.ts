import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const username = session.user.dbUsername || session.user.name;

    if (!username) {
      return NextResponse.json({ error: "Username not found in session" }, { status: 400 });
    }

    // 1. Delete from skl_registry
    const { error: errSkl } = await supabase
      .from("skl_registry")
      .delete()
      .eq("username", username);

    if (errSkl) {
      console.error("Failed to delete from skl_registry:", errSkl);
    }

    // 2. Delete from maba_roles
    const { error: errRoles } = await supabase
      .from("maba_roles")
      .delete()
      .eq("username", username);

    if (errRoles) {
      console.error("Failed to delete from maba_roles:", errRoles);
    }

    // 3. Reset users table data (Soft delete)
    const { error: errUsers } = await supabase
      .from("users")
      .update({
        full_name: null,
        prodi: null,
        kelas: null,
        instagram: null,
        is_verified: false
      })
      .eq("discord_id", discordId);

    if (errUsers) {
      console.error("Failed to update users:", errUsers);
      return NextResponse.json({ error: "Gagal mereset data pengguna." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Akun berhasil direset." });
  } catch (error: any) {
    console.error("Reset API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
