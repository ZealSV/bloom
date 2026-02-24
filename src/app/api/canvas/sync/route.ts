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
  if (!user) {
    console.error("[canvas-sync-route] Unauthorized sync request.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: creds, error: credsErr } = await admin
    .from("canvas_credentials")
    .select("canvas_base_url, canvas_api_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (credsErr) {
    console.error("[canvas-sync-route] Failed to load credentials.", {
      userId: user.id,
      error: credsErr.message,
    });
    return NextResponse.json(
      { error: "Failed to load Canvas credentials." },
      { status: 500 }
    );
  }

  if (!creds) {
    console.warn("[canvas-sync-route] Sync requested without credentials.", {
      userId: user.id,
    });
    return NextResponse.json(
      { error: "No Canvas credentials found. Connect Canvas first." },
      { status: 400 }
    );
  }

  let token: string;
  try {
    token = decryptToken(creds.canvas_api_token_encrypted);
  } catch (e) {
    console.error("[canvas-sync-route] Failed to decrypt Canvas token.", {
      userId: user.id,
      error: String(e),
    });
    return NextResponse.json(
      { error: "Failed to decrypt Canvas token. Please reconnect Canvas." },
      { status: 500 }
    );
  }

  // Parse optional courseIds from request body
  let courseIds: number[] | undefined;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`Unexpected content-type: ${contentType || "none"}`);
    }
    const body = await req.json();
    if (Array.isArray(body.courseIds) && body.courseIds.length > 0) {
      courseIds = body.courseIds
        .map((v: unknown) => Number(v))
        .filter((v: number) => Number.isFinite(v));
    }
  } catch (e) {
    console.warn("[canvas-sync-route] Invalid or empty sync payload. Falling back to full sync.", {
      userId: user.id,
      error: String(e),
    });
    // Empty body is fine — sync all courses
  }

  try {
    const result = await syncCanvasContent(
      user.id,
      { token, baseUrl: creds.canvas_base_url },
      { courseIds }
    );
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[canvas-sync-route] Sync failed with unhandled error.", {
      userId: user.id,
      error: String(e?.message || e),
    });
    return NextResponse.json(
      { error: `Sync failed: ${e?.message || e}` },
      { status: 500 }
    );
  }
}
