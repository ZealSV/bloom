import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { userOwnsSession } from "@/lib/session-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ownsSession = await userOwnsSession(supabase, id, user.id);
  if (!ownsSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const [conceptsRes, gapsRes] = await Promise.all([
    supabase.from("concepts").select("*").eq("session_id", id),
    supabase.from("gaps").select("*").eq("session_id", id),
  ]);

  const concepts = conceptsRes.data ?? [];
  const gaps = gapsRes.data ?? [];

  const overallMastery =
    concepts.length > 0
      ? concepts.reduce((sum, c) => sum + c.mastery_score, 0) / concepts.length
      : 0;

  return NextResponse.json({
    concepts,
    gaps,
    overallMastery: Math.round(overallMastery),
  });
}
