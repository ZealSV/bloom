import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// GET /api/sessions/:id — Get session with messages, concepts, gaps
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [sessionRes, messagesRes, conceptsRes, gapsRes, relsRes] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).single(),
      supabase
        .from("messages")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("concepts").select("*").eq("session_id", id),
      supabase.from("gaps").select("*").eq("session_id", id),
      supabase
        .from("concept_relationships")
        .select("*")
        .eq("session_id", id),
    ]);

  if (sessionRes.error) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    session: sessionRes.data,
    messages: messagesRes.data || [],
    concepts: conceptsRes.data || [],
    gaps: gapsRes.data || [],
    relationships: relsRes.data || [],
  });
}

// DELETE /api/sessions/:id — Delete session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Delete in order due to foreign keys
  await supabase.from("concept_relationships").delete().eq("session_id", id);
  await supabase.from("gaps").delete().eq("session_id", id);
  await supabase.from("concepts").delete().eq("session_id", id);
  await supabase.from("messages").delete().eq("session_id", id);
  const { error } = await supabase.from("sessions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
