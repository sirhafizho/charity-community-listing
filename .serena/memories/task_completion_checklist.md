# After Completing a Task
1. Run `npm run lint`.
2. Run `npm run build`.
3. If Prisma schema or seed logic changed, run `npx prisma generate` and relevant DB sync/seed commands (`npx prisma db push`, `npm run prisma:seed`).
4. Review `git --no-pager status --short` for unintended changes.
5. Note: Next.js 16 emits a warning that `middleware.ts` is deprecated in favor of `proxy`, but the current middleware still builds and works.