import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { authSecret } from "@/lib/auth-secret";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requiresAdmin = pathname.startsWith("/admin");
  const requiresAuth = requiresAdmin || pathname.startsWith("/listings/create");

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: authSecret,
  });

  if (!token?.sub && !token?.id) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresAdmin && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/listings/create"],
};
