import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const role = (user as any)?.role as string | undefined;

  // Admin-only routes — must be authenticated AND have admin role
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
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
