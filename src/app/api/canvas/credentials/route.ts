import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { encryptToken } from "@/lib/canvas-crypto";
import { validateCredentials } from "@/lib/canvas-api";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("canvas_credentials")
    .select(
      "canvas_base_url, last_sync_at, last_sync_status, last_sync_error"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ hasCredentials: false });
  }

  return NextResponse.json({
    hasCredentials: true,
    canvasBaseUrl: data.canvas_base_url,
    lastSyncAt: data.last_sync_at,
    lastSyncStatus: data.last_sync_status,
    lastSyncError: data.last_sync_error,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { canvasBaseUrl, canvasApiToken } = await req.json();

  if (!canvasBaseUrl?.trim() || !canvasApiToken?.trim()) {
    return NextResponse.json(
      { error: "Canvas URL and API token are required" },
      { status: 400 }
    );
  }

  // Validate credentials by calling Canvas API
  const isValid = await validateCredentials({
    token: canvasApiToken.trim(),
    baseUrl: canvasBaseUrl.trim(),
  });

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid Canvas credentials. Check your URL and token." },
      { status: 400 }
    );
  }

  const encrypted = encryptToken(canvasApiToken.trim());
  const admin = getSupabaseAdmin();

  const { error } = await admin.from("canvas_credentials").upsert(
    {
      user_id: user.id,
      canvas_base_url: canvasBaseUrl.trim(),
      canvas_api_token_encrypted: encrypted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save credentials" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  await admin.from("canvas_credentials").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
