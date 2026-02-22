import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  console.error("[subjects] Fetching subjects for user:", user.id);
  let data: any[] | null = null;
  let error: any | null = null;

  const baseQuery = "*, lectures(count), flashcard_decks(count), practice_exams(count)";
  const withDocsQuery = `${baseQuery}, documents(count)`;

  const first = await supabase
    .from("subjects")
    .select(withDocsQuery)
    .order("created_at", { ascending: false });
  data = first.data as any[] | null;
  error = first.error;
  let docsRelationMissing = false;

  if (error && error.code === "PGRST200") {
    console.error("[subjects] Missing documents relation, retrying without it.");
    docsRelationMissing = true;
    const retry = await supabase
      .from("subjects")
      .select(baseQuery)
      .order("created_at", { ascending: false });
    data = retry.data as any[] | null;
    error = retry.error;
  }

  if (error) {
    console.error("[subjects] Fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let documentCountMap: Map<string, number> | null = null;
  if (docsRelationMissing) {
    const { data: docsData, error: docsError } = await supabase
      .from("documents" as any)
      .select("subject_id")
      .not("subject_id", "is", null)
      .eq("user_id", user.id);

    if (!docsError && Array.isArray(docsData)) {
      documentCountMap = new Map<string, number>();
      for (const row of docsData as any[]) {
        const id = row?.subject_id as string | null;
        if (!id) continue;
        documentCountMap.set(id, (documentCountMap.get(id) || 0) + 1);
      }
    }
  }

  const subjects = (data || []).map((s: any) => ({
    id: s.id,
    user_id: s.user_id,
    name: s.name,
    color: s.color,
    canvas_course_id: s.canvas_course_id ?? null,
    created_at: s.created_at,
    lecture_count: s.lectures?.[0]?.count ?? 0,
    deck_count: s.flashcard_decks?.[0]?.count ?? 0,
    exam_count: s.practice_exams?.[0]?.count ?? 0,
    document_count:
      s.documents?.[0]?.count ??
      (documentCountMap ? documentCountMap.get(s.id) || 0 : 0),
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
