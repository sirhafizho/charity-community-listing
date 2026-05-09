"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ApiResponse, Notification as AppNotification } from "@/types";

type NotificationsPayload = {
  unreadCount: number;
  notifications: AppNotification[];
};

function formatRelativeTime(value: string | Date) {
  const createdAt = new Date(value);
  const minutesAgo = Math.round((Date.now() - createdAt.getTime()) / (1000 * 60));

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.round(minutesAgo / 60);

  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  return createdAt.toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result = (await response.json()) as ApiResponse<NotificationsPayload>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to load notifications." : result.error);
      }

      setNotifications(result.data.notifications);
      setUnreadCount(result.data.unreadCount);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetchId = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    const handleFocus = () => {
      void fetchNotifications();
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.clearTimeout(initialFetchId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fetchNotifications]);

  const hasNotifications = notifications.length > 0;
  const sortedNotifications = useMemo(() => notifications, [notifications]);

  const handleNotificationClick = async (notification: AppNotification) => {
    try {
      if (!notification.read) {
        const response = await fetch(`/api/notifications/${notification.id}`, { method: "PUT" });
        const result = (await response.json()) as ApiResponse<AppNotification>;

        if (!response.ok || !result.success) {
          throw new Error(result.success ? "Unable to update notification." : result.error);
        }
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((currentNotification) =>
          currentNotification.id === notification.id
            ? {
                ...currentNotification,
                read: true,
              }
            : currentNotification,
        ),
      );
      setUnreadCount((currentCount) => Math.max(0, notification.read ? currentCount : currentCount - 1));
      setIsOpen(false);

      if (notification.link) {
        router.push(notification.link);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open notification.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", { method: "PUT" });
      const result = (await response.json()) as ApiResponse<{ count: number }>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to update notifications." : result.error);
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update notifications.");
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, { method: "DELETE" });
      const result = (await response.json()) as ApiResponse<null>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to delete notification." : result.error);
      }

      setNotifications((currentNotifications) =>
        currentNotifications.filter((notification) => notification.id !== notificationId),
      );
      setUnreadCount((currentCount) => {
        const notification = notifications.find((item) => item.id === notificationId);
        return notification?.read ? currentCount : Math.max(0, currentCount - 1);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete notification.");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((currentOpen) => !currentOpen);
          if (!isOpen) {
            void fetchNotifications();
          }
        }}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700"
        aria-label="Open notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">Latest activity in your account</p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={unreadCount === 0}
              className="text-xs font-medium text-emerald-700 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-emerald-300 dark:hover:text-emerald-200 dark:disabled:text-slate-500"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-300">Loading notifications...</div>
            ) : !hasNotifications ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-300">No notifications yet.</div>
            ) : (
              sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-700 ${
                    notification.read ? "bg-transparent" : "bg-emerald-50/80 dark:bg-emerald-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(notification.id)}
                      className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      aria-label="Delete notification"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
