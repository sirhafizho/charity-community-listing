import { redirect } from "next/navigation";

import UserDashboard from "@/components/dashboard/UserDashboard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const params = await searchParams;
  const showCreatedNotice = typeof params.created === "string" && params.created === "1";

  const [listings, claims, incomingClaims] = await prisma.$transaction([
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
    prisma.claim.findMany({
      where: { listing: { userId: session.user.id } },
      include: {
        listing: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
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
    incomingClaims: incomingClaims.length,
    pendingIncoming: incomingClaims.filter((claim) => claim.status === "PENDING").length,
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

  const serializedIncomingClaims = incomingClaims.map((claim) => ({
    id: claim.id,
    status: claim.status as "PENDING" | "APPROVED" | "REJECTED",
    createdAt: claim.createdAt.toISOString(),
    message: claim.message,
    listing: claim.listing,
    user: claim.user,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
          Your dashboard
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Manage your impact</h1>
        <p className="max-w-2xl text-slate-600 dark:text-slate-300">
          Track donated listings, follow claim requests, and keep tabs on what your organisation has shared or requested.
        </p>
      </div>

      {showCreatedNotice ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-6 py-5 text-sm text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
          <p className="font-semibold">Your listing is pending admin review.</p>
          <p className="mt-1 text-emerald-700 dark:text-emerald-200">
            We&apos;ll show it publicly once it has been approved by the moderation team.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Total listings</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.totalListings}</p>
        </div>
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm text-emerald-700 dark:text-emerald-200">Approved</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700 dark:text-emerald-100">{stats.approvedListings}</p>
        </div>
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm text-amber-700 dark:text-amber-200">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700 dark:text-amber-100">{stats.pendingListings}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-300">Claims made</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.claimsMade}</p>
        </div>
        <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10">
          <p className="text-sm text-sky-700 dark:text-sky-200">Incoming claims</p>
          <p className="mt-3 text-3xl font-semibold text-sky-700 dark:text-sky-100">{stats.incomingClaims}</p>
          <p className="mt-1 text-xs text-sky-600 dark:text-sky-200/90">{stats.pendingIncoming} pending review</p>
        </div>
        <div className="rounded-[1.75rem] border border-teal-200 bg-teal-50 p-5 shadow-sm dark:border-teal-500/30 dark:bg-teal-500/10">
          <p className="text-sm text-teal-700 dark:text-teal-200">Claims approved</p>
          <p className="mt-3 text-3xl font-semibold text-teal-700 dark:text-teal-100">{stats.approvedClaims}</p>
        </div>
      </section>

      <UserDashboard listings={serializedListings} claims={serializedClaims} incomingClaims={serializedIncomingClaims} />
    </div>
  );
}
