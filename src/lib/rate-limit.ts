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

if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimit) {
      if (now > record.resetTime) rateLimit.delete(key);
    }
  }, 60_000);

  cleanupInterval.unref?.();
}
