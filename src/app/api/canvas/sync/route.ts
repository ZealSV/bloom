import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptToken } from "@/lib/canvas-crypto";
import { syncCanvasContent } from "@/lib/canvas-sync";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
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
      { error: "No Canvas credentials found. Connect Canvas first." },
      { status: 400 }
    );
  }

  let token: string;
  try {
    token = decryptToken(creds.canvas_api_token_encrypted);
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt Canvas token. Please reconnect Canvas." },
      { status: 500 }
    );
  }

  // Parse optional courseIds from request body
  let courseIds: number[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body.courseIds) && body.courseIds.length > 0) {
      courseIds = body.courseIds;
    }
  } catch {
    // Empty body is fine — sync all courses
  }

  const result = await syncCanvasContent(
    user.id,
    { token, baseUrl: creds.canvas_base_url },
    { courseIds }
  );

  return NextResponse.json(result);
}
