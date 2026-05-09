export const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV !== "production"
    ? "charity-community-listing-development-secret"
    : undefined);

if (!authSecret && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be configured in production.");
}
