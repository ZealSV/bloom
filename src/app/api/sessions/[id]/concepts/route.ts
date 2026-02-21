import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [conceptsRes, relsRes] = await Promise.all([
    supabase.from("concepts").select("*").eq("session_id", id),
    supabase.from("concept_relationships").select("*").eq("session_id", id),
  ]);

  return NextResponse.json({
    concepts: conceptsRes.data || [],
    relationships: relsRes.data || [],
  });
}
