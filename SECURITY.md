# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Use [GitHub Security Advisories](https://github.com/sirhafizho/charity-community-listing/security/advisories/new) to report privately
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Security Measures

This project implements:
- Password hashing with bcrypt
- Role-based access control
- Input validation with Zod on all endpoints
- File upload type and size restrictions
- SVG upload blocked (XSS prevention)
- No secrets in source code (Gitleaks CI scan)
- CodeQL static analysis
- Dependency vulnerability scanning
- Race condition protection with database constraints
