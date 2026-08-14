import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
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
