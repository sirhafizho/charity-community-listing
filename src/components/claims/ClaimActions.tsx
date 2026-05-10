"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiResponse, ClaimStatus, UpdateClaimStatusFormValues } from "@/types";

type ClaimActionsProps = {
  claimId: string;
  currentStatus: string;
  isOwner: boolean;
};

export default function ClaimActions({ claimId, currentStatus, isOwner }: ClaimActionsProps) {
  const router = useRouter();
  const [pickupAt, setPickupAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canReviewClaim = currentStatus === "PENDING";
  const canFulfillClaim = currentStatus === "APPROVED";

  if (!isOwner || (!canReviewClaim && !canFulfillClaim)) {
    return null;
  }

  const handleAction = async (status: ClaimStatus) => {
    setError(null);
    setIsSubmitting(true);

    const payload: UpdateClaimStatusFormValues = { status };

    if (status === "APPROVED" && pickupAt) {
      payload.pickupAt = new Date(pickupAt).toISOString();
    }

    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result: ApiResponse<unknown> | null = null;

      try {
        result = (await response.json()) as ApiResponse<unknown>;
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success) {
        throw new Error(result && !result.success ? result.error : "Unable to update claim.");
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {canReviewClaim ? (
        <div className="space-y-2">
          <label htmlFor={`claim-pickup-${claimId}`} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Optional pickup time
          </label>
          <input
            id={`claim-pickup-${claimId}`}
            type="datetime-local"
            value={pickupAt}
            onChange={(event) => setPickupAt(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {canReviewClaim ? (
          <>
            <button
              type="button"
              onClick={() => void handleAction("APPROVED")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
            >
              {isSubmitting ? "Updating…" : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => void handleAction("REJECTED")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
            >
              {isSubmitting ? "Updating…" : "Reject"}
            </button>
          </>
        ) : null}

        {canFulfillClaim ? (
          <button
            type="button"
            onClick={() => void handleAction("FULFILLED")}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
          >
            {isSubmitting ? "Updating…" : "Fulfill"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
