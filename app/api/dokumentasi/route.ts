import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { data: events, error } = await supabase
      .from("dokumentasi_events")
      .select(`
        *,
        author:user_id ( full_name, username, avatar_url, prodi ),
        media:dokumentasi_media(
          id, media_url,
          likes:dokumentasi_likes(id),
          comments:dokumentasi_comments(id)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Process the stats
    const processedEvents = events.map((event: any) => {
      let totalLikes = 0;
      let totalComments = 0;
      let thumbnail: string | string[] | null = null;

      if (event.cover_url) {
        thumbnail = event.cover_url.replace(/\.(mp4|webm|mov|ogg)$/i, '.jpg');
      } else if (event.media && event.media.length > 0) {
        thumbnail = event.media.slice(0, 4).map((m: any) => m.media_url.replace(/\.(mp4|webm|mov|ogg)$/i, '.jpg'));
      }

      if (event.media) {
        event.media.forEach((m: any) => {
          totalLikes += m.likes ? m.likes.length : 0;
          totalComments += m.comments ? m.comments.length : 0;
        });
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        className: event.class_name,
        category: event.category || 'Umum',
        createdAt: event.created_at,
        author: event.author,
        thumbnail,
        mediaCount: event.media ? event.media.length : 0,
        totalLikes,
        totalComments,
      };
    });

    return NextResponse.json({ success: true, events: processedEvents });
  } catch (error: any) {
    console.error("Dokumentasi GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.discordId;
    const body = await req.json();
    const { title, description, className, uploadPermission, category } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, kelas, prodi")
      .eq("discord_id", userId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    let permissionTarget = null;
    if (uploadPermission === "kelas") {
      permissionTarget = dbUser.kelas;
    } else if (uploadPermission === "prodi") {
      permissionTarget = dbUser.prodi;
    }

    const { data: event, error: dbError } = await supabase
      .from("dokumentasi_events")
      .insert({
        user_id: dbUser.id,
        title,
        description,
        class_name: className,
        category: category || 'Umum',
        upload_permission_type: uploadPermission || "all",
        upload_permission_target: permissionTarget
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("Dokumentasi POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
