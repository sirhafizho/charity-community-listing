/**
 * Production-safe seed script.
 * Only seeds if the database is empty (no users exist).
 * Used during first Vercel deployment only.
 */
import { hash } from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("ℹ️  Database already seeded, skipping.");
    return;
  }

  console.log("🌱 Seeding production database...");

  const adminPassword = await hash("admin123", 12);
  const demoPassword = await hash("donor123", 12);
  const memberPassword = await hash("community123", 12);

  await prisma.user.create({
    data: {
      name: "Charity Admin",
      email: "admin@charity.org",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      name: "Demo Donor",
      email: "demo@charity.org",
      password: demoPassword,
      role: "USER",
    },
  });

  await prisma.user.create({
    data: {
      name: "Community Member",
      email: "member@charity.org",
      password: memberPassword,
      role: "USER",
    },
  });

  const categories = [
    { name: "Food & Groceries", description: "Non-perishable food, fresh produce, and meal donations", icon: "🍎" },
    { name: "Clothing", description: "Clothes, shoes, and accessories for all ages", icon: "👕" },
    { name: "Electronics", description: "Working electronics, gadgets, and accessories", icon: "💻" },
    { name: "Furniture", description: "Home furniture and household items", icon: "🪑" },
    { name: "Books & Education", description: "Books, stationery, and educational materials", icon: "📚" },
    { name: "Toys & Games", description: "Children's toys, games, and entertainment", icon: "🎮" },
    { name: "Health & Hygiene", description: "Personal care, hygiene products, and health items", icon: "🧴" },
    { name: "Other", description: "Miscellaneous items that don't fit other categories", icon: "📦" },
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }

  console.log("✅ Production database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
