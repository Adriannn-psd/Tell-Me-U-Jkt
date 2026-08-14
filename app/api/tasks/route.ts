import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", session.user.discordId)
      .order("deadline", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error("Tasks GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, course, deadline, category, notes, status, is_urgent } = body;

    if (!title || !course || !deadline || !category) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        user_id: session.user.discordId,
        title,
        course,
        deadline,
        category,
        notes,
        status: status || 'todo',
        is_urgent: is_urgent || false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("Tasks POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
