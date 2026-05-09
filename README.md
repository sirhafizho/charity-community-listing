# 🤝 Charity Community Listing System

A simple, full-stack charity community listing platform where users can post items for donation, browse available items by category and location, and claim items they need. Includes an admin approval workflow.

## ✨ Features

- **📸 Image Upload** — Upload images for listings (JPEG, PNG, WebP, GIF)
- **📂 Categories** — Organize listings by type (Food, Clothing, Electronics, Furniture, Books, Other)
- **📍 Location** — Add location info to help nearby community members
- **🙋 Claim Button** — Users can claim items with a message
- **🔐 User Authentication** — Register/login with email & password (bcrypt hashed)
- **👨‍💼 Admin Panel** — Approve or reject listings before they go public

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Prisma ORM + SQLite |
| Auth | NextAuth v5 (Credentials) |
| Styling | Tailwind CSS |
| Validation | Zod |
| Testing | Jest + React Testing Library |

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/sirhafizho/charity-community-listing.git
cd charity-community-listing

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Push database schema & seed
npx prisma db push
npm run prisma:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔑 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@charity.org | admin123 |

Register a new account to test as a regular user.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Registration & NextAuth handlers
│   │   ├── listings/     # Listings CRUD
│   │   ├── categories/   # Category management
│   │   ├── claims/       # Claim system
│   │   ├── upload/       # Image upload
│   │   └── admin/        # Admin approval endpoints
│   ├── (auth)/           # Login & Register pages
│   ├── admin/            # Admin dashboard
│   └── listings/         # Browse, detail, create pages
├── components/           # Reusable UI components
├── lib/                  # Utilities (prisma, auth, validation)
└── types/                # TypeScript type definitions
__tests__/
├── api/                  # API integration tests
├── unit/                 # Unit tests (validations)
└── helpers/              # Test utilities & mocks
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

**Test Coverage:** 7 suites, 47 tests covering:
- User registration (validation, duplicates)
- Listings CRUD (create, read, filter, pagination)
- Categories management
- Claims flow (create, update status, withdraw)
- Admin approval/rejection
- Image upload validation
- Zod schema validations

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | ❌ | Register new user |
| GET | /api/categories | ❌ | List all categories |
| GET | /api/listings | ❌ | List approved listings |
| GET | /api/listings/:id | ❌ | Get listing detail |
| POST | /api/listings | ✅ | Create new listing |
| PUT | /api/listings/:id | ✅ | Update own listing |
| DELETE | /api/listings/:id | ✅ | Delete own listing |
| POST | /api/claims | ✅ | Claim a listing |
| DELETE | /api/claims/:id | ✅ | Withdraw claim |
| PUT | /api/claims/:id | ✅ | Update claim status |
| POST | /api/upload | ✅ | Upload image |
| GET | /api/admin/listings | 🔒 | All listings (admin) |
| PUT | /api/admin/listings/:id | 🔒 | Approve/reject listing |

## 🔒 Security

- Passwords hashed with bcrypt
- Role-based access control (USER/ADMIN)
- Input validation with Zod on all endpoints
- File upload type & size validation (5MB max, images only)
- SVG uploads blocked (XSS prevention)
- No email disclosure in public APIs
- Race condition protection on claims (DB unique constraint + transaction)
- Protected admin routes via middleware

## 📄 License

MIT

---

Built with ❤️ for the community.
