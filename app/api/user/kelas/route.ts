import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser, lockUserClass } from "@/lib/supabase";
import {
  KELAS_NUMBERS,
  KELAS_TAIL_MAX_LENGTH,
  buildKelas,
  isValidKelas,
  isValidKelasYear,
  normalizeSegment,
  prefixForProdi,
} from "@/lib/kelas";

/**
 * Kunci kelas user — SEKALI SAJA, tidak bisa diganti.
 *
 * Client hanya mengirim { tahun, nomor, manual }. Prefix (JS1DKV/JS1SI/...)
 * disusun di server dari `users.prodi` supaya tidak ada yang bisa mendaftarkan
 * diri ke kelas prodi lain dengan mengarang string kelas sendiri.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUser(session.user.discordId);
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (!user.is_verified) {
      return NextResponse.json(
        { error: "Verifikasi SKL kamu dulu sebelum memilih kelas" },
        { status: 403 }
      );
    }

    // Kelas paten: tolak sebelum menyentuh DB kalau sudah jelas terkunci
    if (user.kelas) {
      return NextResponse.json(
        {
          error: "Kelas kamu sudah dikunci dan tidak bisa diganti. Hubungi admin di Discord kalau keliru.",
          kelas: user.kelas,
        },
        { status: 409 }
      );
    }

    const prefix = prefixForProdi(user.prodi);
    if (!prefix) {
      return NextResponse.json(
        { error: "Prodi kamu belum terdeteksi. Verifikasi SKL dulu sebelum memilih kelas." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { tahun, nomor, manual } = body ?? {};

    if (!isValidKelasYear(tahun)) {
      return NextResponse.json({ error: "Tahun kelas tidak valid" }, { status: 400 });
    }

    const tail = normalizeSegment(typeof nomor === "string" ? nomor : "");
    if (!tail) {
      return NextResponse.json(
        { error: "Kode kelas tidak boleh kosong" },
        { status: 400 }
      );
    }
    if (tail.length > KELAS_TAIL_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Kode kelas maksimal ${KELAS_TAIL_MAX_LENGTH} karakter` },
        { status: 400 }
      );
    }
    // Kalau bukan input manual, kode kelas wajib salah satu dari daftar scroll
    if (manual !== true && !KELAS_NUMBERS.includes(tail)) {
      return NextResponse.json({ error: "Kode kelas tidak valid" }, { status: 400 });
    }

    const kelas = buildKelas(prefix, tahun, tail);
    if (!isValidKelas(kelas)) {
      return NextResponse.json(
        { error: `Format kelas "${kelas}" tidak valid` },
        { status: 400 }
      );
    }

    const { user: updatedUser, alreadyLocked } = await lockUserClass(
      session.user.discordId,
      kelas
    );

    // Balapan: ada request lain yang menang lebih dulu
    if (alreadyLocked) {
      const fresh = await getUser(session.user.discordId);
      return NextResponse.json(
        {
          error: "Kelas kamu sudah dikunci dan tidak bisa diganti. Hubungi admin di Discord kalau keliru.",
          kelas: fresh?.kelas,
        },
        { status: 409 }
      );
    }

    if (!updatedUser) {
      return NextResponse.json({ error: "Gagal menyimpan kelas" }, { status: 500 });
    }

    return NextResponse.json({ success: true, kelas, user: updatedUser });
  } catch (error) {
    console.error("Update kelas error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
