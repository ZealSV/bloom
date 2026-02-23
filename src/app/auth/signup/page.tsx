"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step === "verify") {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleRequestOtp = async (
    e?: React.FormEvent | React.MouseEvent
  ) => {
    e?.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Unable to send code.");
      setLoading(false);
      return;
    }
    setStep("verify");
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Invalid code.");
      setLoading(false);
      return;
    }

    if (data?.access_token && data?.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
    }

    try {
      await fetch("/api/onboarding", { method: "POST" });
    } catch {
      // Non-blocking for signup UX.
    }
    router.push("/app");
    router.refresh();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = otp.split("");
    next[index] = value;
    const combined = next.join("").padEnd(6, "");
    setOtp(combined);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (step === "verify" && /^\d{6}$/.test(otp)) {
      const form = otpRefs.current[0]?.closest("form");
      form?.requestSubmit();
    }
  }, [otp, step]);

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/bloomlogo.png"
                alt="bloom"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="font-outfit font-semibold text-2xl text-primary">
                bloom
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              Enter the 6-digit code we sent to {email}.
            </p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="space-y-2" />
            </CardHeader>
            <form onSubmit={handleVerifyOtp}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[index] || ""}
                      onChange={(e) =>
                        handleOtpChange(index, e.target.value)
                      }
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="h-12 w-12 text-center text-lg font-semibold"
                    />
                  ))}
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify and continue"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={handleRequestOtp}
                  disabled={loading}
                >
                  Resend code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => setStep("request")}
                  disabled={loading}
                >
                  Change email
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/bloomlogo.png"
              alt="bloom"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="font-outfit font-semibold text-2xl text-primary">
              bloom
            </span>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            Create your account. Start growing.
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="space-y-2" />
          </CardHeader>

          <form onSubmit={handleRequestOtp}>
            <CardContent className="pt-4 space-y-3 w-full max-w-xs mx-auto">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending code..." : "Send code"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
