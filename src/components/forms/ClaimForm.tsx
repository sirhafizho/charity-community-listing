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
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-100">
        You cannot claim your own listing. Share the listing instead so another organisation can request it.
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
        submissionError instanceof Error ? submissionError.message : "Unable to submit claim.";
      setError(nextError);
      toast.error(nextError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
          Request this item
        </p>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Claim this donation</h3>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Tell the donor who you are and how this item could help your community, programme, or charity.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={5}
        maxLength={500}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        placeholder="Optional message to the donor"
      />

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Optional note</span>
        <span>{message.length}/500</span>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
