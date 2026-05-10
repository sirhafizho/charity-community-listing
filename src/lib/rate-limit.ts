import { NextRequest } from "next/server";

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimit.get(key);

  if (!record || now > record.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: limit - record.count };
}

/** Extract client IP from request headers (works on Vercel and locally) */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}

/**
 * Global API rate limit — prevents any single IP from hammering the API.
 * Returns true if allowed, false if blocked.
 */
export function checkGlobalRateLimit(request: NextRequest): boolean {
  const ip = getClientIp(request);
  // 100 requests per minute per IP across all endpoints
  const { success } = checkRateLimit(`global:${ip}`, 100, 60_000);
  return success;
}

/** Rate limit config presets for different endpoint types */
export const RATE_LIMITS = {
  // Auth: prevent brute force
  login: { limit: 20, windowMs: 60_000 },
  register: { limit: 10, windowMs: 60_000 },
  // Write operations: prevent spam
  createListing: { limit: 30, windowMs: 60_000 },
  createClaim: { limit: 30, windowMs: 60_000 },
  updateClaim: { limit: 60, windowMs: 60_000 },
  sendMessage: { limit: 60, windowMs: 60_000 },
  createReport: { limit: 10, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 60_000 },
  // Admin: more generous but still capped
  adminAction: { limit: 120, windowMs: 60_000 },
  // Read operations: prevent scraping
  readApi: { limit: 120, windowMs: 60_000 },
} as const;

if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimit) {
      if (now > record.resetTime) rateLimit.delete(key);
    }
  }, 60_000);

  cleanupInterval.unref?.();
}
