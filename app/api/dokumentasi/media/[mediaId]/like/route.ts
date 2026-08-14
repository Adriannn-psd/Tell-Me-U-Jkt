import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { mediaId } = await params;
    const discordId = session.user.discordId;

    // Get user uuid
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("discord_id", discordId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userId = dbUser.id;

    // Check if already liked
    const { data: existingLike, error: checkError } = await supabase
      .from("dokumentasi_likes")
      .select("id")
      .eq("media_id", mediaId)
      .eq("user_id", userId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError; // PGRST116 is "no rows returned"
    }

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("dokumentasi_likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true, action: "unliked" });
    } else {
      // Like
      const { error: insertError } = await supabase
        .from("dokumentasi_likes")
        .insert({
          media_id: mediaId,
          user_id: userId
        });

      if (insertError) throw insertError;

      // Send notification
      const { data: mediaData } = await supabase.from("dokumentasi_media").select("user_id, event_id").eq("id", mediaId).single();
      if (mediaData && mediaData.user_id !== userId) {
        await supabase.from("notifications").insert({
          recipient_id: mediaData.user_id,
          actor_id: userId,
          type: "like_post",
          reference_id: mediaData.event_id, // we can link to the event
          is_read: false
        });
      }

      return NextResponse.json({ success: true, action: "liked" });
    }
  } catch (error: any) {
    console.error("Dokumentasi Like Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
