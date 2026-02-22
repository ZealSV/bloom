import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptToken } from "@/lib/canvas-crypto";
import { listCourses } from "@/lib/canvas-api";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: creds } = await admin
    .from("canvas_credentials")
    .select("canvas_base_url, canvas_api_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creds) {
    return NextResponse.json(
      { error: "No Canvas credentials found." },
      { status: 400 }
    );
  }

  let token: string;
  try {
    token = decryptToken(creds.canvas_api_token_encrypted);
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt Canvas token. Please reconnect." },
      { status: 500 }
    );
  }

  const credentials = { token, baseUrl: creds.canvas_base_url };

  let courses;
  try {
    courses = await listCourses(credentials, { currentTermOnly: true });
  } catch {
    try {
      courses = await listCourses(credentials, { currentTermOnly: false });
    } catch (e2) {
      return NextResponse.json(
        { error: `Failed to fetch courses: ${e2}` },
        { status: 500 }
      );
    }
  }

  // Check which courses are already synced as subjects
  const { data: existingSubjects } = await admin
    .from("subjects")
    .select("canvas_course_id")
    .eq("user_id", user.id)
    .not("canvas_course_id", "is", null);

  const syncedIds = new Set(
    (existingSubjects || []).map((s: any) => s.canvas_course_id)
  );

  const result = courses.map((c) => ({
    id: c.id,
    name: c.name,
    course_code: c.course_code,
    term: c.term?.name || null,
    alreadySynced: syncedIds.has(c.id),
  }));

  return NextResponse.json(result);
}
