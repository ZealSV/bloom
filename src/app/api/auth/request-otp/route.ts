import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendOtpEmail } from "@/lib/email";
import {
  generateOtp,
  hashOtp,
  OTP_EXPIRY_MS,
  OTP_RATE_LIMIT,
  OTP_RATE_WINDOW_MS,
} from "@/lib/otp";

export const runtime = "nodejs";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ""));

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const windowStart = new Date(Date.now() - OTP_RATE_WINDOW_MS).toISOString();

    const { count, error: countError } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", windowStart);

    if (countError) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    if ((count ?? 0) >= OTP_RATE_LIMIT) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 10 minutes." },
        { status: 429 },
      );
    }

    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("email", email)
      .eq("used", false);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    try {
      await sendOtpEmail(email, otp);
    } catch {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("email", email)
        .eq("otp_hash", otpHash);
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
