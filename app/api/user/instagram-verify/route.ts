import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// AI: Extract Instagram USERNAME from a profile screenshot
async function extractUsernameFromScreenshot(
  fileBase64: string,
  mediaType: string
): Promise<{ username: string; is_valid: boolean } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${cleanKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Kamu adalah extractor data dari screenshot profil Instagram.
Dari screenshot profil Instagram di bawah ini, extract HANYA USERNAME (handle) Instagram dan lakukan validasi keamanan.

ATURAN PENTING & KEAMANAN:
1. Validasi Kepemilikan (SANGAT PENTING): Kamu WAJIB memeriksa foto profil utama (yang ada di bagian atas/tengah halaman profil) dan membandingkannya dengan icon foto profil berukuran kecil di pojok kanan bawah (di *bottom navigation bar*). 
   - Jika kedua foto ini SAMA PERSIS, berarti pengguna sedang melihat profilnya sendiri. (is_valid = true)
   - Jika kedua foto ini BERBEDA, atau salah satunya tidak ditemukan, berarti pengguna sedang melihat profil orang lain / screenshot tidak valid. (is_valid = false)
2. USERNAME adalah teks yang muncul setelah simbol "@" atau di bagian paling atas profil, biasanya berupa huruf kecil, angka, titik, atau underscore.
3. USERNAME BUKAN display name / nama lengkap yang ditampilkan di bawah foto profil.
4. JANGAN ambil nama tampilan / display name.

Kembalikan dalam format JSON:
{
  "is_valid": true/false,
  "username": "username_yang_ditemukan"
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Gemini API error:", res.status, errorBody);
    return null;
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];

  if (
    candidate?.finishReason === "PROHIBITED_CONTENT" ||
    candidate?.finishReason === "SAFETY"
  ) {
    console.error("Gemini blocked the content due to safety.");
    return null;
  }

  const responseText = candidate?.content?.parts?.[0]?.text || "";

  try {
    const cleaned = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.is_valid === false) {
      return { username: "", is_valid: false };
    }

    // Clean up the username
    let username = parsed.username || "";
    username = username.trim().toLowerCase();
    if (username.startsWith("@")) username = username.substring(1);
    if (username.includes("instagram.com/")) {
      const parts = username.split("instagram.com/");
      username = parts[parts.length - 1].split("/")[0].split("?")[0];
    }
    username = username.replace(/\s+/g, "");

    if (!username) return null;

    return { username, is_valid: true };
  } catch {
    console.error("Failed to parse Gemini response:", responseText);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file harus PNG, JPG, atau WebP" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    const result = await extractUsernameFromScreenshot(base64, file.type);

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Gagal membaca username dari screenshot. Pastikan screenshot menampilkan halaman profil Instagram dengan jelas.",
        },
        { status: 400 }
      );
    }

    if (result.is_valid === false) {
      return NextResponse.json(
        {
          error:
            "Screenshot ditolak. Foto profil di atas tidak sama dengan icon foto profil di pojok kanan bawah. Pastikan ini adalah profil kamu sendiri.",
        },
        { status: 400 }
      );
    }

    if (!result.username) {
      return NextResponse.json(
        {
          error:
            "Gagal mengekstrak username dari screenshot.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      username: result.username,
    });
  } catch (error) {
    console.error("Instagram verify error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
