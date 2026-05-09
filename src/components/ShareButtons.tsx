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
      toast.success("Copied!");
      return;
    }

    const targetUrl = shareUrls[action];
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Share this listing</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Help more people discover this donation opportunity.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {shareActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => void handleShare(action.id)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold dark:bg-slate-700">
              {action.icon}
            </span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
