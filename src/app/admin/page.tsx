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
    condition: listing.condition as AdminListing["condition"],
    status: listing.status as AdminListing["status"],
    urgency: listing.urgency as AdminListing["urgency"],
    createdAt: listing.createdAt.toISOString(),
  }));

  const serializedClaims: AdminClaim[] = claims.map((claim) => ({
    ...claim,
    status: claim.status as AdminClaim["status"],
    createdAt: claim.createdAt.toISOString(),
  }));

  const stats = {
    totalListings: listings.length,
    pendingListings: listings.filter((listing) => listing.status === "PENDING").length,
    approvedListings: listings.filter((listing) => listing.status === "APPROVED").length,
    rejectedListings: listings.filter((listing) => listing.status === "REJECTED").length,
    pendingClaims: claims.length,
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
          Admin moderation
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Keep the catalogue healthy</h1>
        <p className="max-w-3xl text-slate-600 dark:text-slate-300">
          Review every listing, prioritise urgent items, and respond to pending claim requests with clearer moderation signals.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Total listings</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.totalListings}</p>
        </div>
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm text-amber-700 dark:text-amber-200">Pending review</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700 dark:text-amber-100">{stats.pendingListings}</p>
        </div>
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm text-emerald-700 dark:text-emerald-200">Approved</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700 dark:text-emerald-100">{stats.approvedListings}</p>
        </div>
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="text-sm text-rose-700 dark:text-rose-200">Rejected</p>
          <p className="mt-3 text-3xl font-semibold text-rose-700 dark:text-rose-100">{stats.rejectedListings}</p>
        </div>
        <div className="rounded-[1.75rem] border border-teal-200 bg-teal-50 p-5 shadow-sm dark:border-teal-500/30 dark:bg-teal-500/10">
          <p className="text-sm text-teal-700 dark:text-teal-200">Pending claims</p>
          <p className="mt-3 text-3xl font-semibold text-teal-700 dark:text-teal-100">{stats.pendingClaims}</p>
        </div>
      </section>

      <AdminDashboard listings={serializedListings} claims={serializedClaims} />
    </div>
  );
}
