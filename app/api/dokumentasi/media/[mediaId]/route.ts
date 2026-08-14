import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getAuthClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
};

const getDriveService = () => google.drive({ version: "v3", auth: getAuthClient() });

export async function DELETE(
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

    // Get current user id
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("discord_id", discordId)
      .single();

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const currentUserId = dbUser.id;

    // Get media details including event author
    const { data: media, error: mediaError } = await supabase
      .from("dokumentasi_media")
      .select(`
        id, user_id, media_url, drive_file_id, event_id,
        event:dokumentasi_events ( user_id )
      `)
      .eq("id", mediaId)
      .single();

    if (mediaError || !media) {
      return NextResponse.json({ success: false, error: "Media not found" }, { status: 404 });
    }

    // Check permissions: Must be uploader OR event owner
    const eventOwnerId = (media.event as any).user_id;
    if (media.user_id !== currentUserId && eventOwnerId !== currentUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized to delete this media" }, { status: 403 });
    }

    // 1. Delete from Cloudinary
    if (media.media_url && process.env.CLOUDINARY_API_KEY) {
      try {
        // Extract public_id from Cloudinary URL (assuming it's after /upload/.../)
        // Example url: https://res.cloudinary.com/demo/image/upload/v1234567890/dokumentasi/eventId_userId_timestamp.jpg
        const urlParts = media.media_url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = "dokumentasi/" + filename.split(".")[0];
        
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudErr) {
        console.error("Cloudinary delete error:", cloudErr);
      }
    }

    // 2. Delete from Google Drive
    if (media.drive_file_id && process.env.GOOGLE_REFRESH_TOKEN) {
      try {
        const drive = getDriveService();
        await drive.files.delete({ fileId: media.drive_file_id, supportsAllDrives: true });
      } catch (driveErr) {
        console.error("Google Drive delete error:", driveErr);
      }
    }

    // 3. Delete from Database
    const { error: deleteError } = await supabase
      .from("dokumentasi_media")
      .delete()
      .eq("id", mediaId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Dokumentasi Media DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
