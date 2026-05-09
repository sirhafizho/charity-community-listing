"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const linkClassName = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    active ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white">
            ❤
          </span>
          Charity Community
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/" className={linkClassName(pathname === "/")}>
            Browse
          </Link>
          <Link
            href="/listings/create"
            className={linkClassName(pathname.startsWith("/listings/create"))}
          >
            Share an Item
          </Link>
          {session?.user.role === "ADMIN" ? (
            <Link href="/admin" className={linkClassName(pathname.startsWith("/admin"))}>
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <span className="text-sm text-slate-500">Loading...</span>
          ) : session?.user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{session.user.name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {session.user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
