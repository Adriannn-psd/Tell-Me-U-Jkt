import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    // Guests may browse pages (content there is dummy), but this endpoint returns
    // real student data, so it requires a logged-in session. The `guest_mode`
    // cookie checked in middleware is client-settable and must not grant access.
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const rawQuery = searchParams.get("q");

    if (!rawQuery || rawQuery.trim().length < 2) {
      return NextResponse.json({ success: true, users: [], posts: [] });
    }

    // The value below is interpolated into a PostgREST .or() filter string, so
    // strip the characters that delimit that syntax (, ( ) " \) plus the LIKE
    // wildcard %, otherwise a crafted q could inject extra filter conditions.
    const query = rawQuery
      .replace(/[%,()"\\]/g, "")
      .trim()
      .slice(0, 50);

    if (query.length < 2) {
      return NextResponse.json({ success: true, users: [], posts: [] });
    }

    // Search users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, username, avatar_url, prodi")
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,prodi.ilike.%${query}%`)
      .limit(5);

    if (usersError) throw usersError;

    // Search posts
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, title, description, media_url")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(5);

    if (postsError) throw postsError;

    return NextResponse.json({
      success: true,
      users,
      posts
    });
  } catch (error: any) {
    console.error("Search GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
