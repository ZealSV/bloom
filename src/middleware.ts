import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isAppPath = pathname.startsWith("/app");
  const isOnboardingPath = pathname === "/app/onboarding";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /app routes
  if (!user && isAppPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Gate onboarding flow inside /app routes.
  if (user && isAppPath) {
    const admin = getSupabaseAdmin();
    const { data: onboardingRow } = await admin
      .from("user_onboarding")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    const onboardingCompleted = onboardingRow?.onboarding_completed === true;

    // First-run users must finish onboarding before accessing app.
    if (!onboardingCompleted && !isOnboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/onboarding";
      return NextResponse.redirect(url);
    }

    // Completed users should not see onboarding again.
    if (onboardingCompleted && isOnboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/app/:path*", "/auth/:path*", "/api/:path*"],
};
