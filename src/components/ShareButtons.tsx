"use client";

import { useMemo } from "react";
import { toast } from "sonner";

type ShareButtonsProps = {
  title: string;
};

type ShareAction = {
  icon: string;
  id: "copy" | "facebook" | "whatsapp" | "x";
  label: string;
};

const shareActions: ShareAction[] = [
  { id: "copy", label: "Copy Link", icon: "🔗" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  { id: "x", label: "Twitter/X", icon: "✕" },
  { id: "facebook", label: "Facebook", icon: "f" },
];

export default function ShareButtons({ title }: ShareButtonsProps) {
  const currentUrl = typeof window === "undefined" ? "" : window.location.href;

  const shareUrls = useMemo(() => {
    const encodedTitle = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(currentUrl);

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${currentUrl}`.trim())}`,
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    };
  }, [currentUrl, title]);

  const handleShare = async (action: ShareAction["id"]) => {
    if (!currentUrl) {
      return;
    }

    if (action === "copy") {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("Link copied to your clipboard.");
      return;
    }

    const targetUrl = shareUrls[action];
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
          Spread the word
        </p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Share this donation opportunity</h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Make this listing visible to more charities, shelters, and community organisers.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shareActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => void handleShare(action.id)}
            className="group inline-flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold dark:bg-slate-700">
                {action.icon}
              </span>
              {action.label}
            </span>
            <span className="text-slate-300 transition group-hover:text-emerald-500 dark:text-slate-500">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
