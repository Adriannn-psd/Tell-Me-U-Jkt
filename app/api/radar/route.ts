import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/*
  Dulu route ini bikin client-nya sendiri: `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", ...)`.
  URL kosong bikin `createClient` melempar "supabaseUrl is required" di module
  scope, dan `next build` mengevaluasi module scope waktu "Collecting page data"
  — jadi build di Docker (yang env-nya baru masuk saat runtime lewat env_file)
  selalu mati di sini. `lib/supabase.ts` sudah punya placeholder buat kasus itu,
  jadi pakai client yang sama saja.
*/
const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    if (!hasServiceKey) {
      return NextResponse.json({ success: false, error: "Missing Supabase Key" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("radar_kampus_posts")
      .select("*")
      .order("original_created_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3); // Fetch only top 3 for the widget

    if (error) {
      console.error("Error fetching radar API:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, posts: data });
  } catch (error: any) {
    console.error("Radar API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
