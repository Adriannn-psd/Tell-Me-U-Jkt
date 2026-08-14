import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Get the scan record first
    const { data: scan, error: fetchError } = await supabase
      .from("ospek_scans")
      .select("id, scanner_id, scanned_id, photo_url")
      .eq("id", id)
      .single();

    if (fetchError || !scan) {
      return NextResponse.json({ success: false, error: "Scan tidak ditemukan" }, { status: 404 });
    }

    // 2. Delete from Cloudinary if URL exists
    if (scan.photo_url && scan.photo_url.includes("cloudinary.com")) {
      try {
        // Extract public_id from URL
        const parts = scan.photo_url.split("/upload/");
        if (parts[1]) {
          // Remove version and extension: v1234567/folder/file.jpg -> folder/file
          const pathAfterUpload = parts[1].replace(/^v\d+\//, "");
          const publicId = pathAfterUpload.replace(/\.\w+$/, "");
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudErr) {
        console.error("Cloudinary delete error (non-fatal):", cloudErr);
      }
    }

    // 3. Delete from database
    const { error: deleteError } = await supabase
      .from("ospek_scans")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DB delete error:", deleteError);
      return NextResponse.json({ success: false, error: "Gagal menghapus" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete scan error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
