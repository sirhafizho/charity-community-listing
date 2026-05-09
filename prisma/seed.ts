import { hash } from "bcryptjs";

import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.claim.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.category.deleteMany();

  const adminPassword = await hash("admin123", 12);
  const memberPassword = await hash("community123", 12);
  const demoPassword = await hash("donor123", 12);

  await prisma.user.upsert({
    where: { email: "admin@charity.org" },
    update: {
      name: "Charity Admin",
      password: adminPassword,
      role: "ADMIN",
    },
    create: {
      name: "Charity Admin",
      email: "admin@charity.org",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "member@charity.org" },
    update: {
      name: "Community Member",
      password: memberPassword,
      role: "USER",
    },
    create: {
      name: "Community Member",
      email: "member@charity.org",
      password: memberPassword,
      role: "USER",
    },
  });

  const demoDonor = await prisma.user.upsert({
    where: { email: "demo@charity.org" },
    update: {
      name: "Demo Donor",
      password: demoPassword,
      role: "USER",
    },
    create: {
      name: "Demo Donor",
      email: "demo@charity.org",
      password: demoPassword,
      role: "USER",
    },
  });

  const categoryNames = ["Food", "Clothing", "Electronics", "Furniture", "Books", "Other"];

  const categories: Array<{ id: string; name: string }> = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.create({
        data: {
          name,
          description: `${name} donations available for community support.`,
        },
      }),
    ),
  );

  const categoryMap = Object.fromEntries(categories.map((category) => [category.name, category.id] as const));

  await prisma.listing.createMany({
    data: [
      {
        title: "Winter coats for families",
        description:
          "A clean bundle of adult and children's winter coats in very good condition. Ideal for shelters or family support programmes.",
        location: "Queens, NY",
        image: "/uploads/sample-coats.svg",
        status: "APPROVED",
        urgency: "URGENT",
        userId: demoDonor.id,
        categoryId: categoryMap.Clothing,
      },
      {
        title: "Office desks and chairs",
        description:
          "Three sturdy desks and four office chairs from a recently closed co-working space. Great for a non-profit office or classroom.",
        location: "Brooklyn, NY",
        image: "/uploads/sample-furniture.svg",
        status: "APPROVED",
        userId: demoDonor.id,
        categoryId: categoryMap.Furniture,
      },
      {
        title: "Children's learning books",
        description:
          "Assorted early-reader books and activity workbooks suitable for after-school programmes and literacy initiatives.",
        location: "Harlem, NY",
        image: "/uploads/sample-books.svg",
        status: "APPROVED",
        urgency: "EXPIRING",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        userId: demoDonor.id,
        categoryId: categoryMap.Books,
      },
    ],
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
