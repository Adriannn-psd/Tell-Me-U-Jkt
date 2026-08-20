import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser, supabase } from "@/lib/supabase";

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

    const user = await getUser(discordId);
    // Kelas itu paten: sekali terkunci, reset akun tidak boleh mencabutnya.
    // `prodi` ikut dipertahankan karena prefix kelas terikat ke prodi — kalau
    // prodi dikosongkan, user bisa verifikasi ulang pakai SKL prodi lain dan
    // kelasnya jadi tidak nyambung. Yang belum punya kelas tetap boleh reset
    // prodi-nya (mis. salah upload SKL waktu pertama kali).
    const kelasTerkunci = !!user?.kelas;

    // Baris skl_registry TIDAK dihapus — baris itulah bukti no_reg tersebut
    // milik Discord ID ini. Kalau dihapus, no_reg jadi bebas diklaim akun lain.
    // Pemiliknya sendiri tetap bisa verifikasi ulang dengan SKL yang sama.

    // Hapus dari maba_roles
    const { error: errRoles } = await supabase
      .from("maba_roles")
      .delete()
      .eq("username", username);

    if (errRoles) {
      console.error("Failed to delete from maba_roles:", errRoles);
    }

    // Reset users table data (Soft delete)
    const resetData: Record<string, unknown> = {
      full_name: null,
      instagram: null,
      bio: null,
      skills: null,
      avatar_url: null,
      is_private: false,
      is_verified: false,
    };

    if (!kelasTerkunci) {
      resetData.prodi = null;
      resetData.kelas = null;
    }

    const { error: errUsers } = await supabase
      .from("users")
      .update(resetData)
      .eq("discord_id", discordId);

    if (errUsers) {
      console.error("Failed to update users:", errUsers);
      return NextResponse.json({ error: "Gagal mereset data pengguna." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: kelasTerkunci
        ? "Akun berhasil direset. Kelas kamu tetap dipertahankan karena sifatnya permanen."
        : "Akun berhasil direset.",
      kelas: kelasTerkunci ? user?.kelas : null,
    });
  } catch (error: any) {
    console.error("Reset API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
