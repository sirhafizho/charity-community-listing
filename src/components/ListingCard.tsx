import Image from "next/image";
import Link from "next/link";

import ConditionBadge from "@/components/ConditionBadge";
import RelativeTime from "@/components/RelativeTime";
import type { ListingCardData } from "@/types";

const statusClasses = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  CLAIMED: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  FULFILLED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
} as const;

function getExpiringLabel(expiresAt?: string | Date | null) {
  if (!expiresAt) {
    return "Expiring soon";
  }

  const expiryDate = new Date(expiresAt);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfExpiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  const daysRemaining = Math.ceil((startOfExpiry.getTime() - startOfToday.getTime()) / millisecondsPerDay);

  if (daysRemaining <= 0) {
    return "Expires today";
  }

  if (daysRemaining === 1) {
    return "Expires in 1 day";
  }

  return `Expires in ${daysRemaining} days`;
}

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

type ListingCardProps = {
  listing: ListingCardData;
  showStatus?: boolean;
};

export default function ListingCard({ listing, showStatus = false }: ListingCardProps) {
  const donorName = listing.user?.name?.trim() || "Community donor";
  const urgencyBadge =
    listing.urgency === "URGENT"
      ? {
          className: "bg-amber-400/95 text-amber-950",
          label: "Urgent pickup",
        }
      : listing.urgency === "EXPIRING"
        ? {
            className: "bg-white/90 text-slate-900",
            label: getExpiringLabel(listing.expiresAt),
          }
        : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500/30">
      <Link href={`/listings/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
          {listing.image ? (
            <Image
              src={listing.image}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 text-5xl text-emerald-700 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-emerald-300">
              🎁
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

          <div className="absolute left-4 top-4 flex max-w-[calc(100%-5rem)] flex-wrap gap-2">
            {listing.category ? (
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900">
                {listing.category.name}
              </span>
            ) : null}
            <ConditionBadge condition={listing.condition} />
          </div>

          {urgencyBadge ? (
            <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${urgencyBadge.className}`}>
              {urgencyBadge.label}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="line-clamp-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {listing.title}
            </h3>
            {listing.tags && listing.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {listing.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="space-y-1">
              <p className="text-sm text-slate-500 dark:text-slate-300">Pickup area: {listing.location}</p>
              <p className="text-xs text-slate-400 dark:text-slate-400">
                Posted <RelativeTime date={listing.createdAt} className="font-medium text-slate-500 dark:text-slate-300" />
              </p>
            </div>
          </div>

          {showStatus ? (
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[listing.status]}`}>
              {listing.status}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700/80">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              {getInitials(donorName)}
            </span>
            <div className="min-w-0">
              <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{donorName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Community donor</p>
            </div>
          </div>

          <Link
            href={`/listings/${listing.id}`}
            className="inline-flex shrink-0 whitespace-nowrap items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400"
          >
            View listing
          </Link>
        </div>
      </div>
    </article>
  );
}
