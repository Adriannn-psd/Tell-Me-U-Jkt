import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser, verifyUser } from "@/lib/supabase";

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
    "teknik informatika": ["informatika", "teknik informatika", "s1 teknik informatika", "if", "s1 informatika"],
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
  return prodiAliases.some((alias) => normalizedJurusan.includes(alias));
}

// ---- API Route ----
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if already verified
  const existingUser = await getUser(session.user.discordId);
  if (existingUser?.is_verified) {
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

    // Check 2: Jakarta indicator present in raw text?
    if (!containsJakartaIndicator(extracted.raw_text)) {
      validationErrors.push(
        "Dokumen tidak menunjukkan afiliasi dengan Telkom University Jakarta."
      );
    }

    // Check 3: Jurusan matches Discord prodi?
    const userProdi = session.user.prodi || existingUser?.prodi;
    if (!userProdi) {
      validationErrors.push(
        "Prodi kamu belum terdeteksi dari Discord. Pastikan kamu punya role prodi di server."
      );
    } else if (
      !extracted.jurusan ||
      !jurusanMatchesProdi(extracted.jurusan, userProdi)
    ) {
      validationErrors.push(
        `Jurusan di dokumen ("${extracted.jurusan || "tidak terdeteksi"}") tidak cocok dengan prodi Discord kamu ("${userProdi}").`
      );
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
    const updated = await verifyUser(
      session.user.discordId,
      extracted.nama_lengkap.trim()
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
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
