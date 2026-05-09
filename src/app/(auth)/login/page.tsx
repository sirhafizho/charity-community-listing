"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

const socialButtons = ["Google", "Apple"] as const;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const registered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error("Invalid email or password.");
      }

      toast.success("Welcome back.");
      router.push(callbackUrl);
      router.refresh();
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Unable to sign in.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(0,480px)] lg:items-center">
      <section className="hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-teal-800 to-emerald-700 p-10 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.8)] lg:block">
        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
          Welcome back
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Reconnect with your community donations dashboard.</h1>
        <p className="mt-4 text-base leading-8 text-emerald-50/90">
          Track your listings, review claim activity, and quickly discover urgent items that still need a home.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-emerald-50/80">My listings</p>
            <p className="mt-2 text-xl font-semibold text-white">Monitor review progress</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-emerald-50/80">Claims</p>
            <p className="mt-2 text-xl font-semibold text-white">See what needs follow-up</p>
          </div>
        </div>
      </section>

      <div className="w-full rounded-[2.25rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Login</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Access your account to claim items, manage donations, and stay updated.
          </p>
        </div>

        {registered ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Your account is ready. Sign in to start browsing and donating.
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {socialButtons.map((provider) => (
            <button
              key={provider}
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 transition disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-400"
            >
              Continue with {provider}
              <span className="ml-2 text-xs">Soon</span>
            </button>
          ))}
        </div>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span>Email login</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="you@example.com"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="Enter your password"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
