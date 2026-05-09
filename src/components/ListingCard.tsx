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

export default function ListingCard({ listing, showStatus = false }: ListingCardProps) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-52 w-full overflow-hidden bg-slate-100">
        {listing.image ? (
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-4xl text-sky-700">
            🎁
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">{listing.title}</h3>
          {showStatus ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[listing.status]}`}
            >
              {listing.status}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          {listing.category ? (
            <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700">
              {listing.category.name}
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2.5 py-1">📍 {listing.location}</span>
        </div>
      </div>
    </Link>
  );
}
