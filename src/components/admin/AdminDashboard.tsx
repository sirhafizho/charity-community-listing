"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { AdminClaim, AdminListing, ApiResponse, Claim, ListingStatus } from "@/types";

type AdminDashboardProps = {
  listings: AdminListing[];
  claims: AdminClaim[];
};

type ListingFilter = "ALL" | ListingStatus;
type ListingSortKey = "title" | "category" | "author" | "location" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

type SortHeaderProps = {
  active: boolean;
  direction: SortDirection;
  label: string;
  onClick: () => void;
};

const statusBadgeClassNames = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-rose-100 text-rose-700",
} as const;

const listingFilters: Array<{ label: string; value: ListingFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

function SortHeader({ active, direction, label, onClick }: SortHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900"
    >
      <span>{label}</span>
      <span className={`text-[10px] ${active ? "text-slate-900" : "text-slate-400"}`}>
        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getListingSortValue(listing: AdminListing, sortKey: ListingSortKey) {
  switch (sortKey) {
    case "title":
      return listing.title;
    case "category":
      return listing.category?.name ?? "";
    case "author":
      return listing.user?.name ?? listing.user?.email ?? "";
    case "location":
      return listing.location;
    case "status":
      return listing.status;
    case "createdAt":
      return new Date(listing.createdAt).getTime();
    default:
      return "";
  }
}

export default function AdminDashboard({ listings, claims }: AdminDashboardProps) {
  const router = useRouter();
  const [listingState, setListingState] = useState(listings);
  const [claimState, setClaimState] = useState(claims);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ListingFilter>("ALL");
  const [sortKey, setSortKey] = useState<ListingSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleListingUpdate = async (listingId: string, status: Exclude<ListingStatus, "PENDING">) => {
    const currentKey = `listing-${listingId}-${status}`;
    setLoadingKey(currentKey);

    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json()) as ApiResponse<AdminListing>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to update listing." : result.error);
      }

      setListingState((currentListings) =>
        currentListings.map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                status: result.data.status,
              }
            : listing,
        ),
      );
      toast.success(`Listing ${status.toLowerCase()}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update listing.");
    } finally {
      setLoadingKey(null);
    }
  };

  const handleClaimUpdate = async (claimId: string, status: Claim["status"]) => {
    const currentKey = `claim-${claimId}-${status}`;
    setLoadingKey(currentKey);

    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json()) as ApiResponse<Claim>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to update claim." : result.error);
      }

      setClaimState((currentClaims) => currentClaims.filter((claim) => claim.id !== claimId));
      toast.success(`Claim ${status.toLowerCase()}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update claim.");
    } finally {
      setLoadingKey(null);
    }
  };

  const listingCounts = {
    ALL: listingState.length,
    PENDING: listingState.filter((listing) => listing.status === "PENDING").length,
    APPROVED: listingState.filter((listing) => listing.status === "APPROVED").length,
    REJECTED: listingState.filter((listing) => listing.status === "REJECTED").length,
  };

  const filteredListings = useMemo(() => {
    const visibleListings =
      activeFilter === "ALL"
        ? listingState
        : listingState.filter((listing) => listing.status === activeFilter);

    return [...visibleListings].sort((left, right) => {
      const leftValue = getListingSortValue(left, sortKey);
      const rightValue = getListingSortValue(right, sortKey);

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        sensitivity: "base",
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [activeFilter, listingState, sortDirection, sortKey]);

  const toggleSort = (nextSortKey: ListingSortKey) => {
    setSortDirection((currentDirection) => {
      if (sortKey !== nextSortKey) {
        return nextSortKey === "createdAt" ? "desc" : "asc";
      }

      return currentDirection === "asc" ? "desc" : "asc";
    });
    setSortKey(nextSortKey);
  };

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">Listings moderation</h2>
            <p className="text-sm text-slate-600">
              Review every community submission in a sortable table so nothing slips through.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Total: {listingCounts.ALL}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
              Pending: {listingCounts.PENDING}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
              Approved: {listingCounts.APPROVED}
            </span>
            <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-700">
              Rejected: {listingCounts.REJECTED}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {listingFilters.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {filter.label}
                <span className={`ml-2 ${isActive ? "text-white/80" : "text-slate-400"}`}>
                  {listingCounts[filter.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left">
                    <SortHeader
                      label="Title"
                      active={sortKey === "title"}
                      direction={sortDirection}
                      onClick={() => toggleSort("title")}
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <SortHeader
                      label="Category"
                      active={sortKey === "category"}
                      direction={sortDirection}
                      onClick={() => toggleSort("category")}
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <SortHeader
                      label="Author"
                      active={sortKey === "author"}
                      direction={sortDirection}
                      onClick={() => toggleSort("author")}
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <SortHeader
                      label="Location"
                      active={sortKey === "location"}
                      direction={sortDirection}
                      onClick={() => toggleSort("location")}
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <SortHeader
                      label="Status"
                      active={sortKey === "status"}
                      direction={sortDirection}
                      onClick={() => toggleSort("status")}
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <SortHeader
                      label="Date"
                      active={sortKey === "createdAt"}
                      direction={sortDirection}
                      onClick={() => toggleSort("createdAt")}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                      No listings match this filter yet.
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="align-top">
                      <td className="px-6 py-4">
                        <div className="min-w-[16rem]">
                          <p className="font-semibold text-slate-900">{listing.title}</p>
                          <p className="mt-1 text-sm text-slate-500">ID: {listing.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {listing.category?.name ?? "Uncategorized"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[12rem] text-sm text-slate-600">
                          <p className="font-medium text-slate-900">{listing.user?.name ?? "Unknown"}</p>
                          <p>{listing.user?.email ?? "No email provided"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{listing.location}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClassNames[listing.status]}`}
                        >
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(listing.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-[11rem] flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleListingUpdate(listing.id, "APPROVED")}
                            disabled={
                              loadingKey === `listing-${listing.id}-APPROVED` ||
                              listing.status === "APPROVED"
                            }
                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleListingUpdate(listing.id, "REJECTED")}
                            disabled={
                              loadingKey === `listing-${listing.id}-REJECTED` ||
                              listing.status === "REJECTED"
                            }
                            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Pending claims</h2>
          <p className="text-sm text-slate-600">
            Review claim requests alongside the requester details before assigning donated items.
          </p>
        </div>

        {claimState.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No pending claims right now.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Listing
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Requester
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Message
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {claimState.map((claim) => (
                    <tr key={claim.id} className="align-top">
                      <td className="px-6 py-4">
                        <div className="min-w-[14rem]">
                          <p className="font-semibold text-slate-900">{claim.listing.title}</p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClassNames[claim.status]}`}
                          >
                            {claim.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[12rem] text-sm text-slate-600">
                          <p className="font-medium text-slate-900">{claim.user.name}</p>
                          <p>{claim.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{claim.listing.location}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="max-w-xs whitespace-pre-wrap">
                          {claim.message || <span className="italic text-slate-400">No message provided.</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(claim.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-[11rem] flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleClaimUpdate(claim.id, "APPROVED")}
                            disabled={loadingKey === `claim-${claim.id}-APPROVED`}
                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleClaimUpdate(claim.id, "REJECTED")}
                            disabled={loadingKey === `claim-${claim.id}-REJECTED`}
                            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
