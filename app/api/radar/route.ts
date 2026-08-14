import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey || "dummy");

export async function GET() {
  try {
    if (!supabaseServiceKey) {
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
