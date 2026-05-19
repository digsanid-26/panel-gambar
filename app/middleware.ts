import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const role = (user as any)?.role as string | undefined;

  // Admin routes — only check authentication here.
  // Role verification is done in the admin layout after calling useSession().update()
  // which re-reads the role from DB (handles stale JWTs from DB role changes).
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const protectedPaths = ["/dashboard", "/stories/create", "/live/create", "/settings", "/school"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const storyEditPattern = /^\/stories\/[^/]+\/edit/;
  const isStoryEdit = storyEditPattern.test(pathname);

  if ((isProtected || isStoryEdit) && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const authPaths = ["/login", "/register"];
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPath && user) {
    const url = req.nextUrl.clone();
    // Admin users go straight to admin dashboard
    url.pathname = role === "admin" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
