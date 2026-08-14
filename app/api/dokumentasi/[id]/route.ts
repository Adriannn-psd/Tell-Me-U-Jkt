import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

export const dynamic = "force-dynamic";

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

async function getOrCreateFolder(drive: any, folderName: string, parentId: string) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return folder.data.id;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Get the event details
    const { data: event, error: eventError } = await supabase
      .from("dokumentasi_events")
      .select(`
        *,
        author:user_id ( full_name, username, avatar_url, prodi )
      `)
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    // Get the media for this event
    const { data: media, error: mediaError } = await supabase
      .from("dokumentasi_media")
      .select(`
        *,
        author:user_id ( full_name, username, avatar_url ),
        likes:dokumentasi_likes(id, user_id),
        comments:dokumentasi_comments(
          id, content, created_at,
          author:user_id ( full_name, username, avatar_url )
        )
      `)
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (mediaError) throw mediaError;

    // Determine if the current user can upload
    let canUpload = false;
    let uploadStatus = "none"; // 'none', 'pending', 'accepted', 'rejected'

    const session = await auth();
    const discordId = session?.user?.discordId;
    let currentUserId = null;
    let isOwner = false;

    if (discordId) {
      const { data: dbUser } = await supabase.from("users").select("id, kelas, prodi").eq("discord_id", discordId).single();
      
      if (dbUser) {
        currentUserId = dbUser.id;
        isOwner = event.author?.id === currentUserId; // Wait, event.author.id is not selected, but event.user_id is in event.

        if (event.user_id === currentUserId) {
          canUpload = true;
          isOwner = true;
        } else if (event.upload_permission_type === "all") {
          canUpload = true;
        } else if (event.upload_permission_type === "kelas" && dbUser.kelas === event.upload_permission_target) {
          canUpload = true;
        } else if (event.upload_permission_type === "prodi" && dbUser.prodi === event.upload_permission_target) {
          canUpload = true;
        }
        
        // If not automatically allowed, check if there's a request
        if (!canUpload) {
          const { data: request } = await supabase
            .from("dokumentasi_upload_requests")
            .select("status")
            .eq("event_id", id)
            .eq("requester_id", currentUserId)
            .single();

          if (request) {
            uploadStatus = request.status;
            if (request.status === "accepted") {
              canUpload = true;
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      event, 
      media,
      canUpload,
      uploadStatus,
      isOwner,
      currentUserId
    });
  } catch (error: any) {
    console.error("Dokumentasi Detail GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: eventId } = resolvedParams;

    const userId = session.user.discordId;
    const userName = session.user.fullName || session.user.name || "Unknown User";
    
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "File is required" }, { status: 400 });
    }

    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, discord_id, username, avatar_url, prodi")
      .eq("discord_id", userId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    
    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from("dokumentasi_events")
      .select("title, drive_folder_id")
      .eq("id", eventId)
      .single();
      
    if (eventError || !event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    // Extract file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const isVideo = mimeType.startsWith("video/");
    
    let photoUrl = "";
    let driveFileId = null;

    // 1. Upload to Cloudinary
    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      photoUrl = await new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "dokumentasi",
            public_id: `${eventId}_${userId}_${Date.now()}`,
            resource_type: "auto",
            transformation: isVideo ? undefined : [{ quality: "auto", fetch_format: "auto" }]
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result.secure_url);
            else reject(new Error("Unknown error"));
          }
        );
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        bufferStream.pipe(uploadStream);
      });
    }

    // 2. Upload to Google Drive
    if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && process.env.GOOGLE_REFRESH_TOKEN) {
      try {
        const drive = getDriveService();
        let eventFolderId = event.drive_folder_id;
        
        if (!eventFolderId) {
          const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
          const dokFolderId = await getOrCreateFolder(drive, "Dokumentasi", rootFolderId);
          
          const cleanEventName = event.title.replace(/[^a-zA-Z0-9 ]/g, "_");
          eventFolderId = await getOrCreateFolder(drive, cleanEventName, dokFolderId);

          // Make the event folder publicly readable so files inside it are downloadable
          await drive.permissions.create({
            fileId: eventFolderId,
            requestBody: { role: 'reader', type: 'anyone' },
          });

          // Save back to DB
          await supabase.from("dokumentasi_events").update({ drive_folder_id: eventFolderId }).eq("id", eventId);
        }

        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `${userName.replace(/[^a-zA-Z0-9 ]/g, "_")}_${Date.now()}.${extension}`;

        const resDrive = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [eventFolderId],
          },
          media: {
            mimeType: mimeType,
            body: bufferStream,
          },
          fields: "id",
          supportsAllDrives: true,
        });
        
        driveFileId = resDrive.data.id;
      } catch (driveErr) {
        console.error("Google Drive Upload Error:", driveErr);
      }
    }

    // 3. Save to database
    const { data: media, error: dbError } = await supabase
      .from("dokumentasi_media")
      .insert({
        event_id: eventId,
        user_id: dbUser.id,
        media_url: photoUrl,
        media_type: "image",
        drive_file_id: driveFileId
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json({ success: false, error: "Gagal menyimpan dokumentasi" }, { status: 500 });
    }

    return NextResponse.json({ success: true, media });

  } catch (error: any) {
    console.error("Dokumentasi Media POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const discordId = session.user.discordId;

    // Verify owner
    const { data: event } = await supabase
      .from("dokumentasi_events")
      .select("user_id, users!inner(discord_id)")
      .eq("id", id)
      .single();

    if (!event || (event.users as any).discord_id !== discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized or not found" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.className !== undefined) updateData.class_name = body.className;
    if (body.uploadPermission !== undefined) updateData.upload_permission_type = body.uploadPermission;
    if (body.cover_url !== undefined) updateData.cover_url = body.cover_url;

    const { error } = await supabase
      .from("dokumentasi_events")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Dokumentasi PUT error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const discordId = session.user.discordId;

    // Verify owner
    const { data: event } = await supabase
      .from("dokumentasi_events")
      .select("user_id, drive_folder_id, users!inner(discord_id)")
      .eq("id", id)
      .single();

    if (!event || (event.users as any).discord_id !== discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized or not found" }, { status: 403 });
    }

    // Optional: Delete from Drive
    if (event.drive_folder_id && process.env.GOOGLE_REFRESH_TOKEN) {
      try {
        const drive = getDriveService();
        await drive.files.delete({ fileId: event.drive_folder_id, supportsAllDrives: true });
      } catch (err) {
        console.error("Failed to delete drive folder", err);
      }
    }

    // Delete event (cascades)
    const { error } = await supabase
      .from("dokumentasi_events")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Dokumentasi DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
