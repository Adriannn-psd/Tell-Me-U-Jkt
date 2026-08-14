import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// Toggle Like
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const userId = session.user.discordId;

    // Check if like exists
    const { data: existing, error: existingError } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing like:", existingError);
    }

    if (existing) {
      // Unlike
      await supabase.from("post_likes").delete().eq("id", existing.id);
      return NextResponse.json({ success: true, liked: false });
    } else {
      // Like
      await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: userId
      });

      // Get user DB ID
      const { data: dbUser } = await supabase.from("users").select("id").eq("discord_id", userId).single();
      
      // Get post author
      const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();

      if (dbUser && post && dbUser.id !== post.user_id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id,
          actor_id: dbUser.id,
          type: "like",
          reference_id: postId,
          is_read: false
        });
      }

      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error: any) {
    console.error("Like API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
