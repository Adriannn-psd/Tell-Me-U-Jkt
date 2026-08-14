import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { google } from "googleapis";

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

// Helper: Get or Create Google Drive Folder
async function getOrCreateFolder(drive: any, name: string, parentId: string) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  return folder.data.id;
}

// Helper: Find existing spreadsheet
async function getFileByName(drive: any, name: string, parentId: string) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  return null;
}

// GET is no longer heavily used since we generate on the fly, but keep it just in case
export async function GET(req: NextRequest) {
  return NextResponse.json({ success: true, url: null });
}

// POST: Create or Update a spreadsheet for personal mutualan export
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const myId = session.user.discordId;
    const myName = session.user.fullName || session.user.name || "Unknown User";

    const body = await req.json();
    const { type, value } = body; // type: "gabungan" | "kelas" | "prodi"
    if (!type) {
      return NextResponse.json({ success: false, error: "type required" }, { status: 400 });
    }

    const authClient = getAuthClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const sheets = google.sheets({ version: "v4", auth: authClient });
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    if (!rootFolderId) {
      return NextResponse.json({ success: false, error: "Root folder ID not configured" }, { status: 500 });
    }


    // 0. Fetch the personal scans first to build userMap
    const { data: allScans, error: scansError } = await supabase
      .from("ospek_scans")
      .select("scanner_id, scanned_id, photo_url, created_at")
      .or(`scanner_id.eq.${myId},scanned_id.eq.${myId}`)
      .order("created_at", { ascending: true });

    if (scansError) throw scansError;

    let filteredScans = allScans || [];
    let userMap = new Map();

    if (allScans && allScans.length > 0) {
      const allIds = [...new Set(allScans.flatMap(s => [s.scanner_id, s.scanned_id]))];
      const { data: allUsers } = await supabase
        .from("users")
        .select("discord_id, full_name, instagram, kelas, prodi")
        .in("discord_id", allIds);

      userMap = new Map(allUsers?.map(u => [u.discord_id, u]) || []);

      if (type === "kelas") {
        filteredScans = allScans.filter(scan => {
          const friendId = scan.scanner_id === myId ? scan.scanned_id : scan.scanner_id;
          const friend = userMap.get(friendId);
          return friend?.kelas === value;
        });
      } else if (type === "prodi") {
        filteredScans = allScans.filter(scan => {
          const friendId = scan.scanner_id === myId ? scan.scanned_id : scan.scanner_id;
          const friend = userMap.get(friendId);
          return friend?.prodi === value || friend?.kelas?.startsWith(value);
        });
      }
    } else {
      // If no scans, still fetch the current user
      const { data: meUser } = await supabase.from("users").select("discord_id, full_name, instagram, kelas, prodi").eq("discord_id", myId).single();
      if (meUser) userMap.set(myId, meUser);
    }
  
    // 1. Get scanned prodi & kelas from first scan to properly nest folders
    let scannedProdi = value;
    let scannedKelas = value;
    if (filteredScans.length > 0) {
      const firstFriendId = filteredScans[0].scanner_id === myId ? filteredScans[0].scanned_id : filteredScans[0].scanner_id;
      const firstFriend = userMap.get(firstFriendId);
      scannedProdi = firstFriend?.prodi || "Unknown_Prodi";
      scannedKelas = firstFriend?.kelas || "Unknown_Kelas";
    }
  
    // 2. Determine target folder and sheet name
    let targetFolderId = rootFolderId;
    let sheetName = `Ospek Mutualan - Gabungan (${myName})`;

    if (type === "kelas") {
      const targetProdiFolder = await getOrCreateFolder(drive, scannedProdi, rootFolderId);
      const targetKelasFolder = await getOrCreateFolder(drive, scannedKelas, targetProdiFolder);
      targetFolderId = await getOrCreateFolder(drive, myName, targetKelasFolder);
      sheetName = `Mutualan Kelas - ${value} (${myName})`;
    } else if (type === "prodi") {
      const targetProdiFolder = await getOrCreateFolder(drive, scannedProdi, rootFolderId);
      targetFolderId = await getOrCreateFolder(drive, myName, targetProdiFolder);
      sheetName = `Mutualan Prodi - ${value} (${myName})`;
    }

    // 3. Check if sheet already exists
    let spreadsheetId = await getFileByName(drive, sheetName, targetFolderId);
    let spreadsheetUrl = "";
    
    if (!spreadsheetId) {
      // 3.a. Create new spreadsheet
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: sheetName },
          sheets: [
            {
              properties: {
                title: "Data Mutualan",
                gridProperties: { frozenRowCount: 1 },
              },
            },
          ],
        },
      });

      spreadsheetId = spreadsheet.data.spreadsheetId!;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      const actualSheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

      // Move spreadsheet to the correct folder
      const fileInfo = await drive.files.get({ fileId: spreadsheetId, fields: 'parents' });
      const previousParents = fileInfo.data.parents?.join(',') || '';
      
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: targetFolderId,
        removeParents: previousParents,
      });

      // Make it public (anyone with link can edit)
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: { role: "writer", type: "anyone" },
      });

      // Format header
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Data Mutualan!A1:D1",
        valueInputOption: "RAW",
        requestBody: {
          values: [["NO", "FOTO", "NAMA LENGKAP", "USN IG"]],
        },
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId: actualSheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.15, blue: 0.12 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)",
              },
            },
            {
              autoResizeDimensions: {
                dimensions: { sheetId: actualSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 4 },
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: actualSheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 },
                properties: { pixelSize: 150 },
                fields: "pixelSize",
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: actualSheetId, dimension: "ROWS", startIndex: 1 },
                properties: { pixelSize: 150 },
                fields: "pixelSize",
              },
            },
          ],
        },
      });
    } else {
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      // Clear old data to rewrite
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Data Mutualan!A2:F1000",
      });
    }

      if (filteredScans.length > 0) {
        // 1. Generate filenames for all scans
        const scanData = filteredScans.map(scan => {
          const scanner = userMap.get(scan.scanner_id);
          const scanned = userMap.get(scan.scanned_id);
          const cleanScanner = (scanner?.full_name || "Scanner").replace(/[^a-zA-Z0-9]/g, "_");
          const cleanScanned = (scanned?.full_name || "Scanned").replace(/[^a-zA-Z0-9]/g, "_");
          const fileName = `${cleanScanner}_dan_${cleanScanned}.jpg`;
          return { ...scan, fileName };
        });

        // 2. Fetch Drive files on the fly
        const driveFileMap = new Map<string, string>();
        const chunkSize = 15;
        for (let i = 0; i < scanData.length; i += chunkSize) {
          const chunk = scanData.slice(i, i + chunkSize);
          const query = "trashed=false and (" + chunk.map(s => `name='${s.fileName.replace(/'/g, "\\'")}'`).join(" or ") + ")";
          try {
            const res = await drive.files.list({
              q: query,
              fields: "files(id, name)",
              spaces: "drive",
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
            });
            
            if (res.data.files) {
              // Make all found files public in parallel so IMAGE() works
              await Promise.all(res.data.files.map(async (f) => {
                if (f.id && f.name) {
                  try {
                    await drive.permissions.create({
                      fileId: f.id,
                      requestBody: { role: "reader", type: "anyone" },
                      supportsAllDrives: true,
                    });
                  } catch (permErr) {
                    console.error("Failed to make file public", f.name);
                  }
                  driveFileMap.set(f.name, f.id);
                }
              }));
            }
          } catch (err) {
            console.error("Drive search error:", err);
          }
        }

        const rows = scanData.map((scan, i) => {
          const friendId = scan.scanner_id === myId ? scan.scanned_id : scan.scanner_id;
          const friend = userMap.get(friendId);
          const friendName = friend?.full_name || friendId;
          const ig = friend?.instagram ? `@${friend.instagram}` : "";
          
          // Use Google Drive URL if found, otherwise fallback to Cloudinary
          const driveId = driveFileMap.get(scan.fileName);
          const finalUrl = driveId ? `https://drive.google.com/uc?export=view&id=${driveId}` : scan.photo_url;
          
          const photoFormula = finalUrl ? `=IMAGE("${finalUrl}")` : "";
          
          return [
            i + 1,
            photoFormula,
            friendName,
            ig,
          ];
        });

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Data Mutualan!A2",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: rows },
        });
      }

    return NextResponse.json({ success: true, spreadsheetUrl });
  } catch (error) {
    console.error("Sheets POST error:", error);
    return NextResponse.json({ success: false, error: "Gagal membuat spreadsheet. Pastikan Google API sudah diaktifkan." }, { status: 500 });
  }
}
