import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username || typeof username !== "string" || username.trim().length < 1) {
    return NextResponse.json(
      { error: "Username tidak valid" },
      { status: 400 }
    );
  }

  // Sanitize username to prevent command injection
  const cleanUsername = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");

  if (!cleanUsername) {
    return NextResponse.json(
      { error: "Username tidak valid setelah sanitasi" },
      { status: 400 }
    );
  }

  try {
    const scriptPath = path.join(process.cwd(), "ig_profile_fetcher.py");

    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" "${cleanUsername}"`,
      {
        cwd: process.cwd(),
        timeout: 30000, // 30 second timeout
        env: { ...process.env },
      }
    );

    if (stderr) {
      console.error("Python stderr:", stderr);
    }

    const result = JSON.parse(stdout.trim());

    if (!result.success) {
      if (result.cooldown) {
        return NextResponse.json(
          { error: result.error, cooldown: result.cooldown },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: result.error || "Gagal mengambil profil" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fallback: result.fallback,
      message: result.message,
      username: result.username,
      full_name: result.full_name,
      profile_pic_url: result.profile_pic_url,
      is_private: result.is_private,
      follower_count: result.follower_count,
      following_count: result.following_count,
    });
  } catch (error: any) {
    console.error("IG profile pic error:", error);

    // Try to parse JSON from error output
    if (error.stdout) {
      try {
        const parsed = JSON.parse(error.stdout.trim());
        return NextResponse.json(
          { error: parsed.error || "Gagal mengambil profil" },
          { status: 400 }
        );
      } catch {}
    }

    return NextResponse.json(
      { error: "Gagal mengambil profil Instagram. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
