import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const dummyId = "dummy_123456";
  
  try {
    const { data, error } = await supabase
      .from("users")
      .upsert({
        discord_id: dummyId,
        username: "dummy_user",
        full_name: "Teman Dummy",
        prodi: "Teknologi Informasi",
        kelas: "TI-A",
        is_verified: true,
      }, { onConflict: "discord_id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "Dummy user created!", 
      qr_data: dummyId,
      instructions: `Buka hp kamu, cari 'QR Code Generator' di Google, lalu buat QR code dari text: ${dummyId}. Arahkan ke webcam laptopmu!`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
