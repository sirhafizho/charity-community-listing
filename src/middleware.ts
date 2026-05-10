import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV !== "production"
    ? "charity-community-listing-development-secret"
    : undefined);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requiresAdmin = pathname.startsWith("/admin");
  const requiresAuth = requiresAdmin || pathname.startsWith("/listings/create");

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const isSecure = request.url.startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req: request,
    secret,
    cookieName,
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
