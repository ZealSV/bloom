import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyOtpHash, OTP_MAX_ATTEMPTS } from "@/lib/otp";

export const runtime = "nodejs";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidOtp(otp: string) {
  return /^\d{6}$/.test(otp);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ""));
    const otp = String(body?.otp || "").trim();
    const password = String(body?.password || "");

    if (!isValidEmail(email) || !isValidOtp(otp) || password.length < 6) {
      return NextResponse.json(
        { error: "Invalid signup details." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return NextResponse.json(
        { error: "No pending code found. Please request a new one." },
        { status: 400 }
      );
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);
      return NextResponse.json(
        { error: "Code expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 400 }
      );
    }

    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    const isValid = verifyOtpHash(otp, otpRecord.otp_hash);
    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Invalid code. ${remaining} attempt${
                  remaining === 1 ? "" : "s"
                } remaining.`
              : "Too many attempts. Please request a new code.",
        },
        { status: 400 }
      );
    }

    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError?.message?.includes("already been registered")) {
      return NextResponse.json(
        { error: "Account already exists. Please sign in." },
        { status: 409 }
      );
    }

    if (createError) {
      return NextResponse.json(
        { error: "Account creation failed. Please try again." },
        { status: 500 }
      );
    }

    const signInRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const session = await signInRes.json();
    if (!signInRes.ok) {
      return NextResponse.json(
        { error: "Authentication failed. Please try again." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
