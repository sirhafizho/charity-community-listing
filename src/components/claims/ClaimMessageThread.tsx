"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import RelativeTime from "@/components/RelativeTime";
import type { ApiResponse, DateLike } from "@/types";

type ThreadMessage = {
  id: string;
  content: string;
  createdAt: DateLike;
  user: {
    id: string;
    name: string;
  };
};

type ClaimMessageThreadProps = {
  claimId: string;
  currentUserId: string;
  isClaimOwner: boolean;
  isListingOwner: boolean;
  messages: ThreadMessage[];
  maxMessages?: number;
};

function normaliseMessage(message: Partial<ThreadMessage> | undefined, fallbackContent: string, currentUserId: string): ThreadMessage {
  return {
    id: message?.id ?? `message-${Date.now()}`,
    content: message?.content?.trim() || fallbackContent,
    createdAt: message?.createdAt ?? new Date().toISOString(),
    user: {
      id: message?.user?.id ?? currentUserId,
      name: message?.user?.name?.trim() || "You",
    },
  };
}

export default function ClaimMessageThread({
  claimId,
  currentUserId,
  isClaimOwner,
  isListingOwner,
  messages,
  maxMessages = 5,
}: ClaimMessageThreadProps) {
  const router = useRouter();
  const [localState, setLocalState] = useState<{
    claimId: string;
    messages: ThreadMessage[];
  }>({
    claimId,
    messages: [],
  });
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const threadMessages = useMemo(() => {
    const seenMessageIds = new Set<string>();
    const localMessages = localState.claimId === claimId ? localState.messages : [];

    return [...messages, ...localMessages].filter((message) => {
      if (seenMessageIds.has(message.id)) {
        return false;
      }

      seenMessageIds.add(message.id);
      return true;
    });
  }, [claimId, localState.claimId, localState.messages, messages]);

  const canReply = isClaimOwner || isListingOwner;
  const limitReached = threadMessages.length >= maxMessages;
  const remainingMessages = useMemo(() => Math.max(maxMessages - threadMessages.length, 0), [maxMessages, threadMessages.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("Please enter a message before sending.");
      return;
    }

    if (limitReached) {
      setError("Conversation limit reached");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/claims/${claimId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmedContent,
        }),
      });

      let result: ApiResponse<ThreadMessage> | null = null;

      try {
        result = (await response.json()) as ApiResponse<ThreadMessage>;
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success) {
        throw new Error(result && !result.success ? result.error : "Unable to send message.");
      }

      setLocalState((currentState) => {
        const currentMessages = currentState.claimId === claimId ? currentState.messages : [];

        if (messages.length + currentMessages.length >= maxMessages) {
          return currentState;
        }

        return {
          claimId,
          messages: [...currentMessages, normaliseMessage(result.data, trimmedContent, currentUserId)],
        };
      });
      setContent("");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to send message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
            Claim conversation
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Stay in touch about this donation</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
          {threadMessages.length}/{maxMessages} messages
        </span>
      </div>

      <div className="space-y-3 rounded-[1.75rem] bg-slate-50 p-4 dark:bg-slate-900">
        {threadMessages.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No messages yet. Start the conversation when you&apos;re ready.
          </div>
        ) : (
          threadMessages.map((message) => {
            const isCurrentUser = message.user.id === currentUserId;

            return (
              <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
                    isCurrentUser
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  <div className={`flex items-center justify-between gap-3 text-xs ${isCurrentUser ? "text-emerald-50/90" : "text-slate-400 dark:text-slate-400"}`}>
                    <span className="font-semibold">{isCurrentUser ? "You" : message.user.name}</span>
                    <RelativeTime date={message.createdAt} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {limitReached ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Conversation limit reached
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {canReply && !limitReached ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={`claim-thread-${claimId}`} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Reply to this conversation
            </label>
            <textarea
              id={`claim-thread-${claimId}`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Share pickup details, timing, or any questions here."
              className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{remainingMessages} messages remaining</span>
            <span>{content.trim().length}/500</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
          >
            {isSubmitting ? "Sending…" : "Send message"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
