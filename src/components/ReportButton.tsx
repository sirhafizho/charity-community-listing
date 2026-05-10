"use client";

import { useEffect, useRef, useState } from "react";

import type { ApiResponse, ReportReason } from "@/types";

type ReportButtonProps = {
  listingId: string;
};

type FeedbackState = {
  tone: "success" | "warning" | "error";
  text: string;
};

const reasonOptions: Array<{
  value: ReportReason;
  label: string;
}> = [
  { value: "SPAM", label: "Spam" },
  { value: "INAPPROPRIATE", label: "Inappropriate" },
  { value: "SCAM", label: "Scam" },
  { value: "OTHER", label: "Other" },
];

const feedbackClasses: Record<FeedbackState["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  error: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
};

export default function ReportButton({ listingId }: ReportButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          reason,
          details: details.trim() || undefined,
        }),
      });

      let result: ApiResponse<unknown> | null = null;

      try {
        result = (await response.json()) as ApiResponse<unknown>;
      } catch {
        result = null;
      }

      if (response.status === 409) {
        setFeedback({ tone: "warning", text: "You've already reported this listing." });
        setIsOpen(false);
        return;
      }

      if (!response.ok || !result?.success) {
        throw new Error(result && !result.success ? result.error : "Unable to submit report.");
      }

      setFeedback({ tone: "success", text: "Report submitted. Thank you." });
      setReason("SPAM");
      setDetails("");
      setIsOpen(false);
    } catch (submissionError) {
      setFeedback({
        tone: "error",
        text: submissionError instanceof Error ? submissionError.message : "Unable to submit report.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={() => {
          setFeedback(null);
          setIsOpen((currentValue) => !currentValue);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
      >
        <span aria-hidden="true">🚩</span>
        <span>Report</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-600 dark:text-rose-200">Flag this listing</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tell us what feels wrong</h3>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Your report helps keep the community safe and trustworthy.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Reason</legend>
              {reasonOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10"
                >
                  <input
                    type="radio"
                    name={`report-reason-${listingId}`}
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="h-4 w-4 border-slate-300 text-rose-500 focus:ring-rose-400"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-2">
              <label htmlFor={`report-details-${listingId}`} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Additional details (optional)
              </label>
              <textarea
                id={`report-details-${listingId}`}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Anything else we should know?"
                className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Optional context helps moderators review faster.</span>
              <span>{details.trim().length}/500</span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
              >
                {isSubmitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {feedback ? (
        <div className={`max-w-sm rounded-[1.5rem] border px-4 py-3 text-sm shadow-sm ${feedbackClasses[feedback.tone]}`}>
          {feedback.text}
        </div>
      ) : null}
    </div>
  );
}
