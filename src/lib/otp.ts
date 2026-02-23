import crypto from "crypto";

export function generateOtp(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const computed = hashOtp(otp);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_RATE_LIMIT = 1;
export const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
