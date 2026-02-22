import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("subjects")
    .select("*, lectures(count), flashcard_decks(count), practice_exams(count)")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const subjects = (data || []).map((s: any) => ({
    id: s.id,
    user_id: s.user_id,
    name: s.name,
    color: s.color,
    created_at: s.created_at,
    lecture_count: s.lectures?.[0]?.count ?? 0,
    deck_count: s.flashcard_decks?.[0]?.count ?? 0,
    exam_count: s.practice_exams?.[0]?.count ?? 0,
  }));

  return NextResponse.json(subjects);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Subject name is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      user_id: user.id,
      name: name.trim(),
      color: color || null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
