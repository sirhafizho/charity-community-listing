"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DashboardListing = {
  id: string;
  title: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CLAIMED" | "FULFILLED";
  createdAt: string;
  category?: {
    name: string;
  } | null;
};

type DashboardClaim = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";
  createdAt: string;
  message?: string | null;
  listing: {
    id: string;
    title: string;
  };
};

type DashboardIncomingClaim = DashboardClaim & {
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type UserDashboardProps = {
  listings: DashboardListing[];
  claims: DashboardClaim[];
  incomingClaims: DashboardIncomingClaim[];
};

type DashboardTab = "listings" | "claims" | "incomingClaims";

const statusClasses = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  CLAIMED: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  FULFILLED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function UserDashboard({ listings, claims, incomingClaims }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("listings");

  const tabs = useMemo(
    () => [
      { id: "listings" as const, label: "My Listings", count: listings.length },
      { id: "claims" as const, label: "My Claims", count: claims.length },
      { id: "incomingClaims" as const, label: "Claims on my items", count: incomingClaims.length },
    ],
    [claims.length, incomingClaims.length, listings.length],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
              }`}
            >
              {tab.label}
              <span className={`ml-2 ${isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "listings" ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-4xl">📦</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No listings yet</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        Share your first item and help someone in your community.
                      </p>
                      <Link href="/listings/create" className="mt-4 inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        Share a donation
                      </Link>
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => (
                    <tr key={listing.id} className="dark:bg-slate-800">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{listing.title}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[listing.status]}`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {listing.category?.name ?? "Uncategorized"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(listing.createdAt)}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                        >
                          View listing
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "claims" ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Listing
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <p className="text-4xl">🤲</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No claims yet</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        Browse the catalogue and request items that could help your cause.
                      </p>
                      <Link href="/" className="mt-4 inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        Browse donations
                      </Link>
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} className="dark:bg-slate-800">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        <Link href={`/listings/${claim.listing.id}`} className="transition hover:text-emerald-700 dark:hover:text-emerald-300">
                          {claim.listing.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[claim.status]}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(claim.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="max-w-xs whitespace-pre-wrap">
                          {claim.message?.trim() ? claim.message.slice(0, 120) : "No message provided."}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Claimer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Listing
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {incomingClaims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-4xl">🔔</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No incoming claims</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        When someone requests one of your items, you&apos;ll see it here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  incomingClaims.map((claim) => (
                    <tr key={claim.id} className="dark:bg-slate-800">
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{claim.user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{claim.user.email}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        <Link href={`/listings/${claim.listing.id}`} className="transition hover:text-emerald-700 dark:hover:text-emerald-300">
                          {claim.listing.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[claim.status]}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(claim.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="max-w-sm whitespace-pre-wrap">
                          {claim.message?.trim() ? claim.message.slice(0, 160) : "No message provided."}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
