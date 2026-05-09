"use client";

import type { ReactElement } from "react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const themeOrder = ["light", "dark", "system"] as const;
type ThemeMode = (typeof themeOrder)[number];

const icons: Record<ThemeMode, ReactElement> = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8M10 16v4M14 16v4" />
    </svg>
  ),
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const currentTheme = mounted && theme && themeOrder.includes(theme as ThemeMode)
    ? (theme as ThemeMode)
    : "system";

  const handleToggle = () => {
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700"
      aria-label={`Switch theme (current: ${currentTheme})`}
      title={`Theme: ${currentTheme}`}
    >
      {icons[currentTheme]}
    </button>
  );
}
