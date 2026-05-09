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
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200";
    case "REJECTED":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";
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
          "rounded-full bg-amber-400 px-3 py-1 text-sm font-semibold text-amber-950 shadow-sm",
        badgeLabel: "Urgent pickup",
        description: "This donation needs to be collected as soon as possible.",
        panelClassName:
          "rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
      };
    case "EXPIRING":
      return {
        badgeClassName:
          "rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900",
        badgeLabel: getExpiringLabel(expiresAt),
        description: "This listing will no longer be available after the posted expiry date.",
        panelClassName:
          "rounded-[1.75rem] border border-orange-200 bg-orange-50 p-6 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100",
      };
    default:
      return null;
  }
};

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase() ?? "")
      .join("") || "CC"
  );
}

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
  const donorName = listing.user.name?.trim() || "Community donor";

  return (
    <div className="space-y-8 pb-16">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
        <Link href="/" className="transition hover:text-emerald-700 dark:hover:text-emerald-300">
          Browse
        </Link>
        <span>/</span>
        <Link
          href={`/?category=${listing.category.id}`}
          className="transition hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          {listing.category.name}
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-100">{listing.title}</span>
      </nav>

      <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-900">
          {listing.image ? (
            <Image src={listing.image} alt={listing.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 text-8xl text-emerald-700 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-emerald-300">
              🎁
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
                {listing.category.name}
              </span>
              <span className="rounded-full bg-slate-950/50 px-3 py-1 text-sm text-white backdrop-blur">
                Location • {listing.location}
              </span>
              {canViewPrivate ? (
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClassName(listing.status)}`}>
                  {listing.status}
                </span>
              ) : null}
              {urgencyMeta ? <span className={urgencyMeta.badgeClassName}>{urgencyMeta.badgeLabel}</span> : null}
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {listing.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-100/90">
              Shared by {donorName} on {listing.createdAt.toLocaleDateString()}.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
                  About this donation
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  What to know before you claim
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Review the item details, urgency notes, and pickup information before contacting the donor.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-slate-500 dark:text-slate-400">Category</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{listing.category.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-slate-500 dark:text-slate-400">Location</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{listing.location}</p>
                </div>
              </div>
            </div>

            {urgencyMeta ? (
              <div className={`mt-8 ${urgencyMeta.panelClassName}`}>
                <h3 className="text-lg font-semibold">Priority notice</h3>
                <p className="mt-2 text-sm leading-6">{urgencyMeta.description}</p>
                {listing.expiresAt ? (
                  <p className="mt-2 text-sm font-medium">
                    Available until {listing.expiresAt.toLocaleDateString()}.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-8 border-t border-slate-100 pt-8 dark:border-slate-700/80">
              <p className="whitespace-pre-line text-base leading-8 text-slate-700 dark:text-slate-300">
                {listing.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">Availability</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {listing.expiresAt ? getExpiringLabel(listing.expiresAt) : "Available until claimed"}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">Donor</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{donorName}</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">Claim status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {existingClaim ? existingClaim.status : "Open for requests"}
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-24">
          {session?.user ? (
            existingClaim ? (
              <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <h2 className="text-lg font-semibold">Your claim is already submitted</h2>
                <p className="mt-2">
                  Current status: <span className="font-semibold">{existingClaim.status}</span>
                </p>
                {existingClaim.message ? (
                  <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    {existingClaim.message}
                  </p>
                ) : null}
              </div>
            ) : (
              <ClaimForm listingId={listing.id} disabled={session.user.id === listing.userId} />
            )
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
                Ready to request it?
              </p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Login to claim this item</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Sign in to contact the donor and explain how this donation would support your organisation.
              </p>
              <Link
                href={`/login?callbackUrl=/listings/${listing.id}`}
                className="mt-5 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Login to claim
              </Link>
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
              Donor information
            </p>
            <div className="mt-4 flex items-center gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                {getInitials(donorName)}
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{donorName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Community donor</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Once your claim is approved, the donor can coordinate pickup or delivery details with you directly.
            </p>
          </div>

          <ShareButtons title={listing.title} />
        </aside>
      </div>
    </div>
  );
}
