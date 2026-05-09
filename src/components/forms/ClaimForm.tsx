"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ApiResponse, Claim } from "@/types";

type ClaimFormProps = {
  listingId: string;
  disabled?: boolean;
};

export default function ClaimForm({ listingId, disabled = false }: ClaimFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (disabled) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-400/60 dark:bg-amber-500/10 dark:text-amber-200">
        You cannot claim your own listing.
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          message,
        }),
      });

      const result = (await response.json()) as ApiResponse<Claim>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to submit claim." : result.error);
      }

      toast.success("Claim submitted successfully.");
      setMessage("");
      router.refresh();
    } catch (submissionError) {
      const nextError =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit claim.";
      setError(nextError);
      toast.error(nextError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Claim this item</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Let the donor know why this listing would help your community.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        maxLength={500}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        placeholder="Optional message to the donor"
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Submitting..." : "Submit claim"}
      </button>
    </form>
  );
}
