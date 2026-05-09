# Contributing to Charity Community Listing

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/sirhafizho/charity-community-listing.git
cd charity-community-listing
npm install
cp .env.example .env
npx prisma db push
npm run prisma:seed
npm run dev
```

## Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test && npx playwright test`
5. Run lint: `npm run lint`
6. Commit with a descriptive message
7. Push and open a Pull Request

## Branch Rules

- `main` is protected — no direct pushes or force pushes
- All changes must go through a Pull Request
- PRs require passing CI checks (lint, build, tests, security scans)

## Code Style

- TypeScript with strict types
- Functional components with hooks
- Zod for runtime validation
- Tailwind CSS for styling (no custom CSS unless necessary)
- Meaningful variable/function names

## Testing

- **Unit tests**: `__tests__/` directory with Jest
- **E2E tests**: `e2e/` directory with Playwright
- Write tests for new features and bug fixes

## Security

- Never commit secrets or credentials
- Use environment variables for sensitive config
- Report security vulnerabilities privately via GitHub Security Advisories
