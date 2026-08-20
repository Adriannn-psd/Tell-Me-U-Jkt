import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser, verifyUser } from "@/lib/supabase";
import { prodiForKelas } from "@/lib/kelas";

// Vercel serverless function timeout (detik).
// Hobby = max 10s, Pro = max 60s. Gemini OCR butuh waktu, jadi set max.
export const maxDuration = 60;

// ---- AI OCR: extract text from uploaded file ----
async function extractTextWithAI(
  fileBase64: string,
  mediaType: string
): Promise<{ nama_lengkap: string; jurusan: string; raw_text: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${cleanKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Kamu adalah OCR extractor. Dari dokumen/gambar di bawah ini, extract HANYA informasi berikut dalam format JSON:
{
  "nama_lengkap": "nama lengkap siswa/mahasiswa yang tertera",
  "no_reg": "11 angka nomor registrasi",
  "jurusan": "nama program studi/jurusan yang tertera",
  "raw_text": "seluruh teks yang bisa kamu baca dari dokumen ini"
}
HANYA kembalikan JSON, tanpa penjelasan lain.`,
          },
          {
            inlineData: {
              mimeType: mediaType,
              data: fileBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Gemini API error:", res.status, errorBody);
    return null;
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];

  if (candidate?.finishReason === "PROHIBITED_CONTENT" || candidate?.finishReason === "SAFETY") {
    console.error("Gemini blocked the content due to safety.");
    return null;
  }

  const responseText = candidate?.content?.parts?.[0]?.text || "";

  // Parse JSON from AI's response
  try {
    const cleaned = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Gemini response:", responseText);
    return null;
  }
}

// ---- Validation Logic (system code, NOT AI) ----

// Normalize text: lowercase, remove extra whitespace
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// Check if document mentions Jakarta / Telkom Jakarta
function containsJakartaIndicator(rawText: string): boolean {
  const normalized = normalize(rawText);
  const indicators = [
    "jakarta",
    "tel-u jakarta",
    "telkom jakarta",
    "telkom university jakarta",
    "universitas telkom jakarta",
  ];
  return indicators.some((indicator) => normalized.includes(indicator));
}

// Check if extracted jurusan matches user's prodi from Discord
function jurusanMatchesProdi(
  extractedJurusan: string,
  userProdi: string
): boolean {
  const normalizedJurusan = normalize(extractedJurusan);
  const normalizedProdi = normalize(userProdi);

  // Direct match
  if (normalizedJurusan.includes(normalizedProdi)) return true;
  if (normalizedProdi.includes(normalizedJurusan)) return true;

  // Alias mappings for common abbreviations
  const aliases: Record<string, string[]> = {
    "teknologi informasi": ["teknologi informasi", "s1 teknologi informasi", "ti"],
    "informatika": ["informatika", "s1 informatika", "teknik informatika", "if"],
    "sistem informasi": ["sistem informasi", "s1 sistem informasi", "si"],
    "desain komunikasi visual": [
      "desain komunikasi visual",
      "dkv",
      "s1 desain komunikasi visual",
      "s1 dkv",
    ],
    "teknik telekomunikasi": [
      "teknik telekomunikasi",
      "telekomunikasi",
      "s1 teknik telekomunikasi",
      "tt",
    ],
  };

  const prodiAliases = aliases[normalizedProdi] || [];
  return prodiAliases.some((alias) => {
    const regex = new RegExp(`\\b${alias}\\b`, "i");
    return regex.test(normalizedJurusan);
  });
}

function deduceProdiFromJurusan(extractedJurusan: string): string | undefined {
  if (!extractedJurusan) return undefined;
  
  const normalizedJurusan = normalize(extractedJurusan);
  const aliases: Record<string, string[]> = {
    "Teknologi Informasi": ["teknologi informasi", "s1 teknologi informasi", "ti"],
    "Informatika": ["informatika", "s1 informatika", "teknik informatika", "if"],
    "Sistem Informasi": ["sistem informasi", "s1 sistem informasi", "si"],
    "Desain Komunikasi Visual": [
      "desain komunikasi visual",
      "dkv",
      "s1 desain komunikasi visual",
      "s1 dkv",
    ],
    "Teknik Telekomunikasi": [
      "teknik telekomunikasi",
      "telekomunikasi",
      "s1 teknik telekomunikasi",
      "tt",
    ],
  };

  for (const [officialName, aliasList] of Object.entries(aliases)) {
    if (aliasList.some((alias) => {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      return regex.test(normalizedJurusan);
    })) {
      return officialName;
    }
  }

  return undefined;
}

// Check if document mentions year 2026 or 2027
function containsYearIndicator(rawText: string): boolean {
  const normalized = normalize(rawText);
  return normalized.includes("2026") || normalized.includes("2027");
}

// ---- API Route ----
export async function POST(req: NextRequest) {
  // Early check: is Gemini API key configured?
  if (!process.env.GEMINI_API_KEY) {
    console.error("[VERIFY] GEMINI_API_KEY is not set in environment variables!");
    return NextResponse.json(
      { error: "Konfigurasi server belum lengkap. Hubungi admin.", details: ["GEMINI_API_KEY belum di-set di server."] },
      { status: 500 }
    );
  }

  const session = await auth();

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if already verified AND has full name
  const existingUser = await getUser(session.user.discordId);
  if (existingUser?.is_verified && existingUser?.full_name) {
    return NextResponse.json(
      { error: "Akun sudah terverifikasi" },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file harus PDF, PNG, JPG, atau WebP" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Step 1: OCR with AI (AI only extracts text, does NOT validate)
    const extracted = await extractTextWithAI(base64, file.type);

    if (!extracted) {
      return NextResponse.json(
        { error: "Gagal membaca dokumen. Pastikan file berisi teks yang jelas." },
        { status: 400 }
      );
    }

    // Step 2: System validation (code validates, NOT AI)
    const validationErrors: string[] = [];

    // Check 1: nama_lengkap extracted?
    if (!extracted.nama_lengkap || extracted.nama_lengkap.trim().length < 3) {
      validationErrors.push("Nama lengkap tidak terdeteksi dalam dokumen.");
    }
    
    // Check 1.5: no_reg extracted and valid?
    const noRegMatch = extracted.raw_text.match(/\b\d{11}\b/);
    const no_reg = noRegMatch ? noRegMatch[0] : (extracted as any).no_reg?.replace(/\D/g, '');
    
    if (!no_reg || no_reg.length !== 11) {
      validationErrors.push("Sistem tidak bisa menemukan 11 Angka Nomor Registrasi di fotomu! Pastikan bagian tersebut tidak terpotong atau blur.");
    } else {
      // Import supabase client dynamically or use the one from lib/supabase to check duplicate
      const { supabase } = await import("@/lib/supabase");
      const { data: existingReg } = await supabase
        .from("skl_registry")
        .select("username, discord_id")
        .eq("no_reg", no_reg)
        .maybeSingle();

      if (existingReg) {
        // Pemilik diikat ke Discord ID — username Discord bisa diganti kapan saja.
        // Baris warisan yang discord_id-nya masih NULL jatuh ke perbandingan username.
        const isOwner = existingReg.discord_id
          ? existingReg.discord_id === session.user.discordId
          : existingReg.username?.toLowerCase() === existingUser?.username?.toLowerCase();

        if (!isOwner) {
          validationErrors.push(`Nomor registrasi **${no_reg}** sudah tertaut dengan akun Discord lain (\`${existingReg.username}\`). Kamu tidak bisa menggunakan SKL milik orang lain!`);
        }
      }
    }

    // Check 2: Jakarta indicator present in raw text?
    if (!containsJakartaIndicator(extracted.raw_text)) {
      validationErrors.push(
        "Dokumen tidak menunjukkan afiliasi dengan Telkom University Jakarta."
      );
    }

    // Check 2.5: Year 2026/2027 present? (sama seperti bot Discord)
    if (!containsYearIndicator(extracted.raw_text)) {
      validationErrors.push(
        "Tahun 2026/2027 tidak terdeteksi dalam dokumen. Pastikan SKL kamu untuk tahun ajaran yang benar."
      );
    }

    // Check 3: Jurusan matches Discord prodi? (If they already have a prodi from Discord)
    const userProdi = session.user.prodi || existingUser?.prodi;
    if (userProdi) {
      if (
        !extracted.jurusan ||
        !jurusanMatchesProdi(extracted.jurusan, userProdi)
      ) {
        validationErrors.push(
          `Jurusan di dokumen ("${extracted.jurusan || "tidak terdeteksi"}") tidak cocok dengan prodi Discord kamu ("${userProdi}").`
        );
      }
    } else {
      // If they don't have a prodi from Discord, make sure we at least extracted one from the SKL
      if (!extracted.jurusan) {
        validationErrors.push("Jurusan tidak terdeteksi dalam dokumen. Mohon pastikan dokumen mencantumkan program studi Anda.");
      }
    }

    // Check 3.5: Kelas sudah terkunci? Prodi ikut terkunci.
    // Prefix kelas (JS1DKV, JS1SI, ...) terikat ke prodi, jadi user yang kelasnya
    // sudah paten tidak boleh verifikasi ulang pakai SKL prodi lain. Ini backstop
    // untuk Check 3: kalau kolom `prodi` pernah kosong (akun lama yang direset
    // sebelum perbaikan), Check 3 dilewati dan prodi bisa melenceng.
    const prodiTerkunci = prodiForKelas(existingUser?.kelas);
    if (prodiTerkunci) {
      const prodiSkl = extracted.jurusan ? deduceProdiFromJurusan(extracted.jurusan) : undefined;
      if (prodiSkl && prodiSkl !== prodiTerkunci) {
        validationErrors.push(
          `Kelas kamu sudah terkunci di **${existingUser?.kelas}** (${prodiTerkunci}), ` +
            `sedangkan SKL yang kamu upload prodinya **${prodiSkl}**. ` +
            `Kalau ini keliru, minta admin jalankan \`!resetkelas\` di Discord.`
        );
      }
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Verifikasi gagal",
          details: validationErrors,
          extracted: {
            nama_lengkap: extracted.nama_lengkap,
            jurusan: extracted.jurusan,
          },
        },
        { status: 422 }
      );
    }

    // Step 3: All checks passed — verify user in Supabase
    // Dedukdi prodi jika user belum milih di web
    let finalProdi = session.user.prodi || existingUser?.prodi;
    if (prodiTerkunci) {
      // Kelas paten = prodi paten. Sekalian memulihkan kolom prodi yang pernah
      // dikosongkan reset akun lama, tanpa bisa digeser oleh isi SKL.
      finalProdi = prodiTerkunci;
    } else if (!finalProdi && extracted.jurusan) {
      finalProdi = deduceProdiFromJurusan(extracted.jurusan);
    }

    const updated = await verifyUser(
      session.user.discordId,
      extracted.nama_lengkap.trim(),
      existingUser?.username,
      no_reg,
      finalProdi
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Gagal menyimpan verifikasi" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      nama_lengkap: extracted.nama_lengkap.trim(),
      message: "Verifikasi berhasil! Nama dan centang biru sudah ditambahkan.",
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[VERIFY] Verification error:", errMsg, error);
    return NextResponse.json(
      { 
        error: "Terjadi kesalahan internal", 
        details: [process.env.NODE_ENV === "development" ? errMsg : "Coba lagi nanti atau hubungi admin."] 
      },
      { status: 500 }
    );
  }
}
