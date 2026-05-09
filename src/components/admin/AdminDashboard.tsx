"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import ListingCard from "@/components/ListingCard";
import type { AdminClaim, AdminListing, ApiResponse, Claim, ListingStatus } from "@/types";

type AdminDashboardProps = {
  listings: AdminListing[];
  claims: AdminClaim[];
};

const badgeClassNames = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-rose-100 text-rose-700",
} as const;

export default function AdminDashboard({ listings, claims }: AdminDashboardProps) {
  const router = useRouter();
  const [listingState, setListingState] = useState(listings);
  const [claimState, setClaimState] = useState(claims);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

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

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Listings moderation</h2>
            <p className="text-sm text-slate-600">Review, approve, or reject community submissions.</p>
          </div>
          <div className="flex gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">Total: {listingState.length}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
              Pending: {listingState.filter((listing) => listing.status === "PENDING").length}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {listingState.map((listing) => (
            <div key={listing.id} className="space-y-3">
              <ListingCard listing={listing} showStatus />
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">
                  Shared by <span className="font-medium text-slate-900">{listing.user?.name}</span>
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleListingUpdate(listing.id, "APPROVED")}
                    disabled={loadingKey === `listing-${listing.id}-APPROVED` || listing.status === "APPROVED"}
                    className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleListingUpdate(listing.id, "REJECTED")}
                    disabled={loadingKey === `listing-${listing.id}-REJECTED` || listing.status === "REJECTED"}
                    className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Pending claims</h2>
          <p className="text-sm text-slate-600">Respond to claim requests from community members.</p>
        </div>

        {claimState.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No pending claims right now.
          </div>
        ) : (
          <div className="space-y-4">
            {claimState.map((claim) => (
              <div
                key={claim.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{claim.listing.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassNames[claim.status]}`}>
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Requested by <span className="font-medium text-slate-900">{claim.user.name}</span>
                      {" · "}
                      {claim.user.email}
                    </p>
                    <p className="text-sm text-slate-500">Location: {claim.listing.location}</p>
                    {claim.message ? (
                      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {claim.message}
                      </p>
                    ) : (
                      <p className="text-sm italic text-slate-400">No message was provided.</p>
                    )}
                  </div>

                  <div className="flex w-full gap-2 lg:w-auto">
                    <button
                      type="button"
                      onClick={() => void handleClaimUpdate(claim.id, "APPROVED")}
                      disabled={loadingKey === `claim-${claim.id}-APPROVED`}
                      className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:flex-none"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleClaimUpdate(claim.id, "REJECTED")}
                      disabled={loadingKey === `claim-${claim.id}-REJECTED`}
                      className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:flex-none"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
