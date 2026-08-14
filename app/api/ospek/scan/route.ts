import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

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
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`,
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

// Helper: Append row to Google Sheets if exists
async function appendToSheet(scannerName: string, scannedName: string, scannedIg: string, photoUrl: string, kelas: string) {
  try {
    const { data: sheetData } = await supabase
      .from("ospek_sheets")
      .select("spreadsheet_id")
      .eq("kelas", kelas)
      .single();

    if (!sheetData) return; // No sheet for this kelas

    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    
    // Get current row count to determine row number
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetData.spreadsheet_id,
      range: "Data Mutualan!A:A",
    });
    const rowNum = (existing.data.values?.length || 1);

    const now = new Date();
    const timeStr = now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetData.spreadsheet_id,
      range: "Data Mutualan!A2",
      valueInputOption: "RAW",
      requestBody: {
        values: [[rowNum, scannerName, scannedName, scannedIg ? `@${scannedIg}` : "", timeStr, photoUrl]],
      },
    });
  } catch (err) {
    console.error("Sheets append error (non-fatal):", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const scannerId = session.user.discordId;
    const body = await req.json();
    const { scannedId, photoBase64 } = body;

    if (!scannedId || !photoBase64) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    if (scannerId === scannedId) {
      return NextResponse.json({ success: false, error: "Tidak bisa scan QR sendiri!" }, { status: 400 });
    }

    // 1. Dapatkan detail kedua user dari database
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("discord_id, full_name, prodi, kelas, instagram")
      .in("discord_id", [scannerId, scannedId]);

    if (usersError || !usersData || usersData.length !== 2) {
      return NextResponse.json({ success: false, error: "Pengguna tidak valid" }, { status: 400 });
    }

    const scanner = usersData.find(u => u.discord_id === scannerId);
    const scanned = usersData.find(u => u.discord_id === scannedId);

    if (!scanner || !scanned) {
      return NextResponse.json({ success: false, error: "Pengguna tidak ditemukan" }, { status: 400 });
    }

    // Convert base64 to buffer
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Create clean filenames
    const cleanScannerName = (scanner.full_name || "Scanner").replace(/[^a-zA-Z0-9]/g, "_");
    const cleanScannedName = (scanned.full_name || "Scanned").replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${cleanScannerName}_dan_${cleanScannedName}.jpg`;

    let photoUrl = "";

    // 2. Upload Preview ke Cloudinary
    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      photoUrl = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: "ospek_mutualan",
            public_id: `${scannerId}_${scannedId}_${Date.now()}`,
            format: "jpg",
            transformation: [{ width: 800, crop: "limit", quality: "auto", fetch_format: "auto" }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result?.secure_url || "");
          }
        ).end(buffer);
      });
    } else {
      // Fallback ke Supabase
      const fallbackName = `${scannerId}_${scannedId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("ospek_photos")
        .upload(fallbackName, buffer, { contentType: "image/jpeg" });
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from("ospek_photos").getPublicUrl(fallbackName);
        photoUrl = publicUrlData.publicUrl;
      }
    }

    // 3. Upload Original ke Google Drive (Folder baru: Root → Prodi → Kelas → Nama Scanner → Prodi-Kelas Scanned)
    if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && process.env.GOOGLE_REFRESH_TOKEN) {
      try {
        const drive = getDriveService();
        const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
        
        const scannerProdi = scanner.prodi || "Unknown_Prodi";
        const scannerKelas = scanner.kelas || "Unknown_Kelas";
        const scannerFullName = scanner.full_name || "Unknown";
        const scannedProdi = scanned.prodi || "Unknown_Prodi";
        const scannedKelas = scanned.kelas || "Unknown_Kelas";

        // Root → Prodi Scanner
        const scannerProdiFolderId = await getOrCreateFolder(drive, scannerProdi, rootFolderId);
        // → Kelas Scanner
        const scannerKelasFolderId = await getOrCreateFolder(drive, scannerKelas, scannerProdiFolderId);
        // → Nama Scanner
        const scannerNameFolderId = await getOrCreateFolder(drive, scannerFullName, scannerKelasFolderId);
        
        let scannedNameFolderId = scannerNameFolderId;
        
        if (scannerId !== scannedId) {
          const scannedFullName = scanned.full_name || "Unknown";
          // Root → Prodi Scanned
          const scannedProdiFolderId = await getOrCreateFolder(drive, scannedProdi, rootFolderId);
          // → Kelas Scanned
          const scannedKelasFolderId = await getOrCreateFolder(drive, scannedKelas, scannedProdiFolderId);
          // → Nama Scanned
          scannedNameFolderId = await getOrCreateFolder(drive, scannedFullName, scannedKelasFolderId);
        }

        // Upload foto ke folder target
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        const driveRes = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [...new Set([scannerNameFolderId, scannedNameFolderId])],
          },
          media: {
            mimeType: "image/jpeg",
            body: bufferStream,
          },
          fields: "id",
          supportsAllDrives: true,
        });

        if (driveRes.data.id) {
          try {
            await drive.permissions.create({
              fileId: driveRes.data.id,
              requestBody: { role: "reader", type: "anyone" },
              supportsAllDrives: true,
            });
          } catch (permErr) {
            console.error("Failed to set public permission on photo:", permErr);
          }
        }
      } catch (driveErr) {
        console.error("Google Drive Upload Error:", driveErr);
      }
    }

    // 4. Save to database
    const { error: dbError } = await supabase
      .from("ospek_scans")
      .insert({
        scanner_id: scannerId,
        scanned_id: scannedId,
        photo_url: photoUrl
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
      if (dbError.code === "23505") {
        return NextResponse.json({ success: false, error: "Kalian sudah pernah mutualan!" }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: "Gagal menyimpan data scan" }, { status: 500 });
    }

    // 5. Auto-append ke Google Sheets (untuk kedua kelas yang terlibat)
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      const scannerKelas = scanner.kelas;
      const scannedKelas = scanned.kelas;
      
      if (scannerKelas) {
        await appendToSheet(scanner.full_name, scanned.full_name, scanned.instagram || "", photoUrl, scannerKelas);
      }
      if (scannedKelas && scannedKelas !== scannerKelas) {
        await appendToSheet(scanner.full_name, scanned.full_name, scanned.instagram || "", photoUrl, scannedKelas);
      }
    }

    return NextResponse.json({ success: true, photoUrl });

  } catch (error) {
    console.error("Scan API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
