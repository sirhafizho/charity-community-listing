import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShareButtons from "@/components/ShareButtons";
import ClaimForm from "@/components/forms/ClaimForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const getStatusClassName = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

const getExpiringLabel = (expiresAt?: Date | null) => {
  if (!expiresAt) {
    return "Expiring soon";
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfExpiry = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());
  const daysRemaining = Math.ceil((startOfExpiry.getTime() - startOfToday.getTime()) / millisecondsPerDay);

  if (daysRemaining <= 0) {
    return "Expires today";
  }

  if (daysRemaining === 1) {
    return "Expires in 1 day";
  }

  return `Expires in ${daysRemaining} days`;
};

const getUrgencyMeta = (urgency: string, expiresAt?: Date | null) => {
  switch (urgency) {
    case "URGENT":
      return {
        badgeClassName:
          "animate-pulse rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
        badgeLabel: "⚡ Urgent pickup",
        description: "This donation needs to be collected as soon as possible.",
        panelClassName:
          "rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
      };
    case "EXPIRING":
      return {
        badgeClassName:
          "rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-200",
        badgeLabel: `⏰ ${getExpiringLabel(expiresAt)}`,
        description: "This listing will no longer be available after the posted expiry date.",
        panelClassName:
          "rounded-3xl border border-orange-200 bg-orange-50 p-6 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100",
      };
    default:
      return null;
  }
};

async function getListingById(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      category: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) {
    return {
      title: "Listing not found",
      description: "This community listing could not be found.",
    };
  }

  const description = listing.description.slice(0, 160);

  return {
    title: listing.title,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.image ? [{ url: listing.image }] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const listing = await getListingById(id);

  if (!listing) {
    notFound();
  }

  const canViewPrivate = session?.user.role === "ADMIN" || session?.user.id === listing.userId;

  if (listing.status !== "APPROVED" && !canViewPrivate) {
    notFound();
  }

  const existingClaim = session?.user.id
    ? await prisma.claim.findFirst({
        where: {
          listingId: listing.id,
          userId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const urgencyMeta = getUrgencyMeta(listing.urgency, listing.expiresAt);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr,0.9fr]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="relative h-80 bg-slate-100 dark:bg-slate-900 sm:h-[28rem]">
          {listing.image ? (
            <Image src={listing.image} alt={listing.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-7xl text-sky-700 dark:from-slate-800 dark:to-slate-700 dark:text-sky-300">
              🎁
            </div>
          )}
        </div>

        <div className="space-y-6 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
              {listing.category.name}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              📍 {listing.location}
            </span>
            {canViewPrivate ? (
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClassName(listing.status)}`}>
                {listing.status}
              </span>
            ) : null}
            {urgencyMeta ? <span className={urgencyMeta.badgeClassName}>{urgencyMeta.badgeLabel}</span> : null}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{listing.title}</h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
              Shared by {listing.user.name} on {listing.createdAt.toLocaleDateString()}
            </p>
          </div>

          {urgencyMeta ? (
            <div className={urgencyMeta.panelClassName}>
              <h2 className="text-lg font-semibold">Priority notice</h2>
              <p className="mt-2 text-sm leading-6">{urgencyMeta.description}</p>
              {listing.expiresAt ? (
                <p className="mt-2 text-sm font-medium">
                  Available until {listing.expiresAt.toLocaleDateString()}.
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="whitespace-pre-line text-base leading-8 text-slate-700 dark:text-slate-300">{listing.description}</p>
        </div>
      </section>

      <aside className="space-y-6">
        {session?.user ? (
          existingClaim ? (
            <div className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-sm text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100">
              <h2 className="text-lg font-semibold">Your claim is already submitted</h2>
              <p className="mt-2">
                Current status: <span className="font-semibold">{existingClaim.status}</span>
              </p>
              {existingClaim.message ? (
                <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-slate-700 dark:bg-slate-700 dark:text-slate-100">{existingClaim.message}</p>
              ) : null}
            </div>
          ) : (
            <ClaimForm listingId={listing.id} disabled={session.user.id === listing.userId} />
          )
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Want to claim this item?</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Sign in to contact the donor and submit a claim request.
            </p>
            <Link
              href={`/login?callbackUrl=/listings/${listing.id}`}
              className="mt-5 inline-flex rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Login to claim
            </Link>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Need more details?</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Submit a claim request and the donor can follow up with collection or delivery information.
          </p>
        </div>

        <ShareButtons title={listing.title} />
      </aside>
    </div>
  );
}
