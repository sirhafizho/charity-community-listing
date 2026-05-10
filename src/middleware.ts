import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requiresAdmin = pathname.startsWith("/admin");
  const requiresAuth = requiresAdmin || pathname.startsWith("/listings/create");

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresAdmin && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/listings/create"],
};
