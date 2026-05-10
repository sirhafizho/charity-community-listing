"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiResponse } from "@/types";

type ImpactStats = {
  itemsDonated: number;
  peopleHelped: number;
  daysActive: number;
  itemsReceived: number;
};

type ImpactBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
};

type ImpactPayload = {
  stats?: Partial<ImpactStats> & {
    peoplHelped?: number;
    itemsClaimed?: number;
  };
  badges?: Array<string | Partial<ImpactBadge>>;
  itemsDonated?: number;
  peopleHelped?: number;
  peoplHelped?: number;
  daysActive?: number;
  itemsReceived?: number;
  itemsClaimed?: number;
};

const badgeCatalog: Omit<ImpactBadge, "earned">[] = [
  {
    id: "first-share",
    name: "First Share",
    description: "Shared your very first item with the community.",
    icon: "🎁",
  },
  {
    id: "generous",
    name: "Generous",
    description: "Kept the giving going with multiple donations.",
    icon: "💝",
  },
  {
    id: "hero",
    name: "Hero",
    description: "Made an outsized difference for people in need.",
    icon: "🌟",
  },
  {
    id: "legend",
    name: "Legend",
    description: "Reached a standout milestone of community impact.",
    icon: "👑",
  },
  {
    id: "helper",
    name: "Helper",
    description: "Received items and helped keep donations moving.",
    icon: "🤝",
  },
  {
    id: "active-helper",
    name: "Active Helper",
    description: "Stayed consistently active in supporting others.",
    icon: "⚡",
  },
];

const skeletonCards = Array.from({ length: 4 }, (_, index) => index);
const skeletonBadges = Array.from({ length: badgeCatalog.length }, (_, index) => index);

function normaliseKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normaliseStats(payload: ImpactPayload | undefined): ImpactStats {
  const source = payload?.stats ?? payload ?? {};

  return {
    itemsDonated: asNumber(source.itemsDonated),
    peopleHelped: asNumber(source.peopleHelped ?? source.peoplHelped ?? payload?.peopleHelped ?? payload?.peoplHelped),
    daysActive: asNumber(source.daysActive),
    itemsReceived: asNumber(source.itemsReceived ?? source.itemsClaimed ?? payload?.itemsReceived ?? payload?.itemsClaimed),
  };
}

function normaliseBadges(payload: ImpactPayload | undefined): ImpactBadge[] {
  const badges = badgeCatalog.map((badge) => ({ ...badge, earned: false }));

  for (const rawBadge of payload?.badges ?? []) {
    const rawValues =
      typeof rawBadge === "string"
        ? { id: rawBadge, name: rawBadge, earned: true }
        : {
            id: rawBadge.id,
            name: rawBadge.name,
            description: rawBadge.description,
            icon: rawBadge.icon,
            earned: rawBadge.earned,
          };

    const candidateKeys = [rawValues.id, rawValues.name]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map(normaliseKey);

    const matchIndex = badges.findIndex((badge) => {
      const badgeKeys = [badge.id, badge.name].map(normaliseKey);
      return candidateKeys.some((candidateKey) => badgeKeys.includes(candidateKey));
    });

    if (matchIndex === -1) {
      continue;
    }

    badges[matchIndex] = {
      ...badges[matchIndex],
      description: rawValues.description?.trim() || badges[matchIndex].description,
      icon: rawValues.icon?.trim() || badges[matchIndex].icon,
      earned: rawValues.earned ?? true,
    };
  }

  return badges;
}

async function fetchImpactData(signal?: AbortSignal) {
  const response = await fetch("/api/users/me/impact", {
    cache: "no-store",
    signal,
  });

  let result: ApiResponse<ImpactPayload> | null = null;

  try {
    result = (await response.json()) as ApiResponse<ImpactPayload>;
  } catch {
    result = null;
  }

  if (!response.ok || !result?.success) {
    throw new Error(result && !result.success ? result.error : "Unable to load your impact dashboard.");
  }

  return {
    stats: normaliseStats(result.data),
    badges: normaliseBadges(result.data),
  };
}

export default function ImpactDashboard() {
  const [data, setData] = useState<{
    stats: ImpactStats;
    badges: ImpactBadge[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImpact = async (signal?: AbortSignal) => {
    try {
      const nextData = await fetchImpactData(signal);

      if (!signal?.aborted) {
        setData(nextData);
        setError(null);
      }
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load your impact dashboard.");
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const initialiseImpact = async () => {
      try {
        const nextData = await fetchImpactData(controller.signal);

        if (!controller.signal.aborted) {
          setData(nextData);
          setError(null);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load your impact dashboard.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void initialiseImpact();

    return () => {
      controller.abort();
    };
  }, []);

  const earnedBadgeCount = useMemo(() => data?.badges.filter((badge) => badge.earned).length ?? 0, [data]);

  if (isLoading) {
    return (
      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-60 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {skeletonCards.map((card) => (
            <div key={card} className="rounded-[1.75rem] border border-slate-200 p-5 dark:border-slate-700">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-10 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skeletonBadges.map((badge) => (
            <div key={badge} className="rounded-[1.75rem] border border-slate-200 p-5 dark:border-slate-700">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-5 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-700 dark:text-rose-200">Impact dashboard</p>
        <h2 className="mt-2 text-2xl font-semibold text-rose-900 dark:text-rose-100">We couldn&apos;t load your impact right now</h2>
        <p className="mt-3 text-sm leading-6 text-rose-700 dark:text-rose-100">{error}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            void loadImpact();
          }}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">Impact dashboard</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">See the difference you&apos;re making</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Track your giving momentum, celebrate milestones, and see how your contributions help the wider community.
          </p>
        </div>
        <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          {earnedBadgeCount}/{data.badges.length} badges earned
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm text-emerald-700 dark:text-emerald-200">Items Donated</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700 dark:text-emerald-100">{data.stats.itemsDonated}</p>
        </div>
        <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10">
          <p className="text-sm text-sky-700 dark:text-sky-200">People Helped</p>
          <p className="mt-3 text-3xl font-semibold text-sky-700 dark:text-sky-100">{data.stats.peopleHelped}</p>
        </div>
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm text-amber-700 dark:text-amber-200">Days Active</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700 dark:text-amber-100">{data.stats.daysActive}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">Items Received</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{data.stats.itemsReceived}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Badges</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Unlock more by sharing consistently and staying active in your community.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.badges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-[1.75rem] border p-5 shadow-sm transition ${
                badge.earned
                  ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:via-slate-800 dark:to-amber-500/10"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
                    badge.earned ? "bg-white shadow-sm dark:bg-slate-900" : "bg-slate-200 opacity-60 dark:bg-slate-700"
                  }`}
                >
                  {badge.icon}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    badge.earned
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {badge.earned ? "Earned" : "Locked"}
                </span>
              </div>
              <h4 className={`mt-4 text-lg font-semibold ${badge.earned ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-300"}`}>
                {badge.name}
              </h4>
              <p className={`mt-2 text-sm leading-6 ${badge.earned ? "text-slate-600 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
