import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

export const dynamic = "force-dynamic";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Google Auth
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

// Helper: Get or Create Google Drive Folder
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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        *,
        author:user_id ( full_name, username, avatar_url, prodi ),
        collaborator:collaborator_id ( full_name, username, avatar_url, prodi ),
        likes:post_likes(id, user_id),
        comments:post_comments(id)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter out private posts unless following or it's the user's own post
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: users } = await supabase.from("users").select("id, is_private").in("id", userIds);
    const privacyMap = Object.fromEntries((users || []).map(u => [u.id, u.is_private]));

    let currentUserDbId = null;
    const followingIds = new Set<string>();

    if (session?.user?.discordId) {
      const { data: me } = await supabase.from("users").select("id").eq("discord_id", session.user.discordId).single();
      if (me) {
        currentUserDbId = me.id;
        const { data: follows } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", me.id)
          .eq("status", "accepted");
          
        if (follows) {
          follows.forEach(f => followingIds.add(f.following_id));
        }
      }
    }

    const visiblePosts = posts.filter(p => {
      const isPrivate = privacyMap[p.user_id];
      if (!isPrivate) return true;
      if (currentUserDbId === p.user_id) return true;
      if (followingIds.has(p.user_id)) return true;
      return false;
    });

    const processedPosts = visiblePosts.map(p => ({
      ...p,
      isLiked: currentUserDbId && p.likes ? p.likes.some((l: any) => l.user_id === currentUserDbId) : false
    }));

    return NextResponse.json({ success: true, posts: processedPosts });
  } catch (error: any) {
    console.error("Posts GET error:", error);
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
    const userName = session.user.fullName || session.user.name || "Unknown User";
    
    const body = await req.json();
    const { title, description, tags, aspectRatio, photoUrl, collaborator_username } = body;

    let collaborator_id = null;
    if (collaborator_username) {
      const { data: collabUser } = await supabase.from("users").select("id").eq("username", collaborator_username).single();
      if (collabUser) collaborator_id = collabUser.id;
    }

    if (!title || !photoUrl) {
      return NextResponse.json({ success: false, error: "Title and photoUrl are required" }, { status: 400 });
    }

    // Fetch user UUID and prodi from database using discordId
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, discord_id, username, avatar_url, prodi, is_verified")
      .eq("discord_id", userId)
      .single();

    if (userError || !dbUser) {
      console.error("User not found in database:", userError);
      return NextResponse.json({ success: false, error: "User not found in database" }, { status: 404 });
    }

    if (!dbUser.is_verified) {
      return NextResponse.json({ success: false, error: "not_verified", message: "Anda harus verifikasi SKL terlebih dahulu" }, { status: 403 });
    }

    if (!dbUser.prodi) {
      return NextResponse.json({ success: false, error: "no_prodi", message: "Data prodi tidak ditemukan. Silakan hubungi admin." }, { status: 400 });
    }

    const dbUserId = dbUser.id;

    // WORKAROUND: Supabase `posts` table has a foreign key to `profiles` instead of `users`.
    await supabase.from("profiles").upsert({
      id: dbUserId,
      discord_id: dbUser.discord_id,
      username: dbUser.username,
      avatar_url: dbUser.avatar_url,
      prodi: dbUser.prodi
    });

    const uploadTasks: Promise<void>[] = [];

    // Upload Original ke Google Drive (Root -> Karya -> Nama User) dari link Cloudinary
    if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && process.env.GOOGLE_REFRESH_TOKEN) {
      uploadTasks.push(
        (async () => {
          try {
            const drive = getDriveService();
            const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID as string;
            
            const karyaFolderId = await getOrCreateFolder(drive, "Karya", rootFolderId);
            
            const cleanUserName = userName.replace(/[^a-zA-Z0-9 ]/g, "_");
            const userFolderId = await getOrCreateFolder(drive, cleanUserName, karyaFolderId);

            // Fetch file dari Cloudinary
            const response = await fetch(photoUrl);
            if (!response.ok || !response.body) {
                throw new Error("Failed to fetch image from Cloudinary for Drive backup");
            }
            
            // Konversi web ReadableStream ke Node stream
            const { Readable } = require('stream');
            const nodeStream = Readable.fromWeb(response.body);

            let mimeType = response.headers.get("content-type") || "image/jpeg";
            let ext = mimeType.split("/")[1] || "jpg";
            // Normalisasi ekstensi
            if (ext === "jpeg") ext = "jpg";
            if (ext === "quicktime") ext = "mov";

            const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, "_");
            const fileName = `${cleanTitle}_${Date.now()}.${ext}`;

            // Optional timeout wrapper to prevent hanging the whole request for huge files on Vercel
            const uploadPromise = drive.files.create({
              requestBody: {
                name: fileName,
                parents: [userFolderId],
              },
              media: {
                mimeType: mimeType,
                body: nodeStream,
              },
              fields: "id",
              supportsAllDrives: true,
            });

            // Beri batas waktu 6 detik maksimal untuk Google Drive upload di serverless
            // Jika lewat, fungsi akan jalan terus di background (di local) atau terpotong (di Vercel)
            // tanpa menggagalkan pengembalian response ke user.
            await Promise.race([
              uploadPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("Drive upload timeout exceeded")), 6000))
            ]);
          } catch (driveErr: any) {
            console.warn("Google Drive Upload Note:", driveErr.message || driveErr);
            // Don't throw for Drive since it's meant to be optional/silent fail if needed
          }
        })()
      );
    }

    // Tunggu backup selesai (atau batas timeout tercapai)
    if (uploadTasks.length > 0) {
      await Promise.all(uploadTasks);
    }

    // 3. Save to database
    const { data: post, error: dbError } = await supabase
      .from("posts")
      .insert({
        user_id: dbUserId,
        title,
        description,
        prodi: dbUser.prodi || "Umum",
        media_url: photoUrl,
        collaborator_id,
        collab_status: collaborator_id ? 'pending' : null
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json({ success: false, error: "Gagal menyimpan karya" }, { status: 500 });
    }

    // 4. Send Notifications (Collab & Mentions)
    const notificationsToInsert = [];

    if (collaborator_id) {
      notificationsToInsert.push({
        recipient_id: collaborator_id,
        actor_id: dbUserId,
        type: "collab_request",
        reference_id: post.id,
        is_read: false
      });
    }

    // Parse mentions
    const textToParse = `${title} ${description || ""}`;
    const mentions = textToParse.match(/@([a-zA-Z0-9_.]+)/g);
    if (mentions) {
      const usernames = mentions.map((m: string) => m.substring(1));
      const { data: mentionedUsers } = await supabase.from("users").select("id").in("username", usernames);
      if (mentionedUsers) {
        for (const u of mentionedUsers) {
          if (u.id !== dbUserId && u.id !== collaborator_id) {
            notificationsToInsert.push({
              recipient_id: u.id,
              actor_id: dbUserId,
              type: "mention",
              reference_id: post.id,
              is_read: false
            });
          }
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    return NextResponse.json({ success: true, post });

  } catch (error: any) {
    console.error("Posts POST Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
