import { redirect } from "next/navigation";

import UserDashboard from "@/components/dashboard/UserDashboard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const [listings, claims] = await prisma.$transaction([
    prisma.listing.findMany({
      where: { userId: session.user.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.claim.findMany({
      where: { userId: session.user.id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stats = {
    totalListings: listings.length,
    approvedListings: listings.filter((listing) => listing.status === "APPROVED").length,
    pendingListings: listings.filter((listing) => listing.status === "PENDING").length,
    claimsMade: claims.length,
    approvedClaims: claims.filter((claim) => claim.status === "APPROVED").length,
  };

  const serializedListings = listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    status: listing.status as "PENDING" | "APPROVED" | "REJECTED",
    createdAt: listing.createdAt.toISOString(),
    category: listing.category,
  }));

  const serializedClaims = claims.map((claim) => ({
    id: claim.id,
    status: claim.status as "PENDING" | "APPROVED" | "REJECTED",
    createdAt: claim.createdAt.toISOString(),
    message: claim.message,
    listing: claim.listing,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Track your donated listings and claim requests in one place.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Total listings</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.totalListings}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Approved</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-600 dark:text-emerald-300">{stats.approvedListings}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-amber-600 dark:text-amber-300">{stats.pendingListings}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Claims made</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.claimsMade}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Claims approved</p>
          <p className="mt-3 text-3xl font-semibold text-sky-600 dark:text-sky-300">{stats.approvedClaims}</p>
        </div>
      </section>

      <UserDashboard listings={serializedListings} claims={serializedClaims} />
    </div>
  );
}
