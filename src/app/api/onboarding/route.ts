import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// POST /api/onboarding
// Idempotently creates onboarding row for the authenticated user.
export async function POST() {
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await admin
    .from("user_onboarding")
    .upsert(
      { user_id: user.id, onboarding_completed: false },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

  if (error) {
    return NextResponse.json(
      { error: "Unable to initialize onboarding." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

// PATCH /api/onboarding
// Marks onboarding as completed for the authenticated user.
export async function PATCH() {
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await admin
    .from("user_onboarding")
    .upsert(
      { user_id: user.id, onboarding_completed: true },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json(
      { error: "Unable to complete onboarding." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
