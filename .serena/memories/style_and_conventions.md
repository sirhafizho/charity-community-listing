# Style and Conventions
- TypeScript-first codebase with strict type-checking.
- App Router patterns are used throughout (`src/app/...`).
- Server-side auth reads use `auth()` from `@/lib/auth`.
- API routes validate request payloads with Zod and return JSON success/error envelopes.
- Tailwind utility classes are used directly in components for styling.
- Client components use the `"use client"` directive and local state for loading/error UX.
- Shared domain/api types live in `src/types`.
- Prisma access goes through the singleton in `src/lib/prisma`.
- Keep changes surgical and validate with `npm run lint` and `npm run build`.