import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Optimistic auth gate + Supabase session refresh for the whole app — unlike
 * the quiz app (public quiz + gated /admin subsection), this entire app is
 * an internal tool, so everything except /login is gated. Per Next's own
 * guidance, Proxy is not a full authorization solution on its own — this is
 * a redirect-early convenience; each protected page/action re-checks auth
 * server-side against ADMIN_EMAIL before doing anything.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAuthorized = !!user && !!adminEmail && user.email === adminEmail;

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";

  if (!isLoginRoute && !isAuthorized) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLoginRoute && isAuthorized) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
