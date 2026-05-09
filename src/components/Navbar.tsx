"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";

const linkClassName = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    active
      ? "bg-emerald-600 text-white"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
  }`;

const mobileLinkClassName = (active: boolean) =>
  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
    active
      ? "bg-emerald-600 text-white"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
  }`;

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  const navItems = [
    { href: "/", label: "Browse", active: pathname === "/" },
    {
      href: "/listings/create",
      label: "Share an Item",
      active: pathname.startsWith("/listings/create"),
    },
    ...(session?.user
      ? [{ href: "/dashboard", label: "Dashboard", active: pathname.startsWith("/dashboard") }]
      : []),
    ...(session?.user.role === "ADMIN"
      ? [{ href: "/admin", label: "Admin", active: pathname.startsWith("/admin") }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
            ❤
          </span>
          Charity Community
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={linkClassName(item.active)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session?.user ? <NotificationBell /> : null}
          <ThemeToggle />
          {status === "loading" ? (
            <span className="text-sm text-slate-500 dark:text-slate-300">Loading...</span>
          ) : session?.user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{session.user.name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">{session.user.role}</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {session?.user ? <NotificationBell /> : null}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((currentState) => !currentState)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div id="mobile-navigation" className="border-t border-slate-200 dark:border-slate-700 md:hidden">
          <div className="mx-auto max-w-7xl px-4 pb-4 pt-4 sm:px-6 lg:px-8">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <nav className="grid gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={mobileLinkClassName(item.active)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                {status === "loading" ? (
                  <span className="text-sm text-slate-500 dark:text-slate-300">Loading...</span>
                ) : session?.user ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{session.user.name}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">{session.user.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        void signOut({ callbackUrl: "/" });
                      }}
                      className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMenu}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
