"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import RelativeTime from "@/components/RelativeTime";
import type { ApiResponse, DateLike } from "@/types";

type GratitudeNoteCard = {
  content: string;
  createdAt: DateLike;
  user: {
    name: string;
  };
};

type GratitudeFormProps = {
  claimId: string;
  existingNote?: GratitudeNoteCard | null;
};

function ThankYouCard({ note }: { note: GratitudeNoteCard }) {
  return (
    <div className="rounded-[2rem] border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6 shadow-sm dark:border-rose-500/30 dark:from-rose-500/10 dark:via-slate-800 dark:to-amber-500/10">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm dark:bg-slate-900">
          ❤️
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-600 dark:text-rose-200">Thank you note</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{note.content}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{note.user.name}</span>
            <span>•</span>
            <RelativeTime date={note.createdAt} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GratitudeForm({ claimId, existingNote = null }: GratitudeFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [localState, setLocalState] = useState<{
    claimId: string;
    note: GratitudeNoteCard | null;
  }>({
    claimId,
    note: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const note = localState.claimId === claimId ? (localState.note ?? existingNote) : existingNote;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("Please add a thank-you note before sending.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/claims/${claimId}/gratitude`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmedContent,
        }),
      });

      let result: ApiResponse<GratitudeNoteCard> | null = null;

      try {
        result = (await response.json()) as ApiResponse<GratitudeNoteCard>;
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success) {
        throw new Error(result && !result.success ? result.error : "Unable to send thank-you note.");
      }

      setLocalState({
        claimId,
        note: {
          content: result.data.content?.trim() || trimmedContent,
          createdAt: result.data.createdAt ?? new Date().toISOString(),
          user: {
            name: result.data.user?.name?.trim() || "You",
          },
        },
      });
      setContent("");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to send thank-you note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (note) {
    return <ThankYouCard note={note} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-600 dark:text-rose-200">Share gratitude</p>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Send a heartfelt thank you</h3>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Let the donor know how their generosity supported your organisation or community.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`gratitude-note-${claimId}`} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Your thank-you note
        </label>
        <textarea
          id={`gratitude-note-${claimId}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell them what this donation made possible."
          className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Visible on this claim</span>
        <span>{content.trim().length}/1000</span>
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
      >
        {isSubmitting ? "Sending…" : "Send Thank You"}
      </button>
    </form>
  );
}
