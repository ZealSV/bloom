import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: examId } = await params;

  const { data: exam, error } = await supabase
    .from("practice_exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (error || !exam)
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  // Also fetch any previous attempts
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .order("completed_at", { ascending: false });

  return NextResponse.json({ exam, attempts: attempts || [] });
}
