import { redirect } from "next/navigation";

import AdminDashboard from "@/components/admin/AdminDashboard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AdminClaim, AdminListing } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [listings, claims] = await prisma.$transaction([
    prisma.listing.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.claim.findMany({
      where: { status: "PENDING" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const serializedListings: AdminListing[] = listings.map((listing) => ({
    ...listing,
    status: listing.status as AdminListing["status"],
    urgency: listing.urgency as AdminListing["urgency"],
    createdAt: listing.createdAt.toISOString(),
  }));

  const serializedClaims: AdminClaim[] = claims.map((claim) => ({
    ...claim,
    status: claim.status as AdminClaim["status"],
    createdAt: claim.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin panel</h1>
        <p className="mt-2 text-slate-600">
          Moderate listings, manage claim requests, and keep the community catalogue up to date.
        </p>
      </div>

      <AdminDashboard listings={serializedListings} claims={serializedClaims} />
    </div>
  );
}
