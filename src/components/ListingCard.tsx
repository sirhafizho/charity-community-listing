import Image from "next/image";
import Link from "next/link";

import type { ListingCardData } from "@/types";

const statusClasses = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-rose-100 text-rose-700",
} as const;

type ListingCardProps = {
  listing: ListingCardData;
  showStatus?: boolean;
};

function getExpiringLabel(expiresAt?: string | Date | null) {
  if (!expiresAt) {
    return "⏰ Expiring soon";
  }

  const expiryDate = new Date(expiresAt);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfExpiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  const daysRemaining = Math.ceil((startOfExpiry.getTime() - startOfToday.getTime()) / millisecondsPerDay);

  if (daysRemaining <= 0) {
    return "⏰ Expires today";
  }

  if (daysRemaining === 1) {
    return "⏰ Expires in 1 day";
  }

  return `⏰ Expires in ${daysRemaining} days`;
}

export default function ListingCard({ listing, showStatus = false }: ListingCardProps) {
  const urgencyBadge =
    listing.urgency === "URGENT"
      ? {
          className:
            "animate-pulse rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
          label: "⚡ Urgent",
        }
      : listing.urgency === "EXPIRING"
        ? {
            className:
              "rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-200",
            label: getExpiringLabel(listing.expiresAt),
          }
        : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="relative h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        {listing.image ? (
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-4xl text-sky-700 dark:from-slate-800 dark:to-slate-700 dark:text-sky-300">
            🎁
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            {urgencyBadge ? <span className={urgencyBadge.className}>{urgencyBadge.label}</span> : null}
            <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{listing.title}</h3>
          </div>
          {showStatus ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[listing.status]}`}
            >
              {listing.status}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
          {listing.category ? (
            <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
              {listing.category.name}
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700 dark:text-slate-200">📍 {listing.location}</span>
        </div>
      </div>
    </Link>
  );
}
