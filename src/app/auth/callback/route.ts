import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const admin = getSupabaseAdmin();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure onboarding row exists for newly confirmed users.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await admin
            .from("user_onboarding")
            .upsert(
              { user_id: user.id, onboarding_completed: false },
              { onConflict: "user_id", ignoreDuplicates: true }
            );
        }
      } catch {
        // Do not block login redirect if this fails.
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
