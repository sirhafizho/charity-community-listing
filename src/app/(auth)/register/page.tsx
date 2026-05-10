"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ApiResponse, User } from "@/types";

const socialButtons = ["Google", "Apple"] as const;

function getPasswordStrength(password: string) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (!password) {
    return {
      score: 0,
      label: "Add a password",
      hint: "Use 8+ characters with a number and symbol.",
    };
  }

  if (score <= 1) {
    return {
      score,
      label: "Weak",
      hint: "Add length, a number, and a special character.",
    };
  }

  if (score === 2) {
    return {
      score,
      label: "Fair",
      hint: "A stronger password protects your account better.",
    };
  }

  if (score === 3) {
    return {
      score,
      label: "Good",
      hint: "One more unique character mix makes it even stronger.",
    };
  }

  return {
    score,
    label: "Strong",
    hint: "Great choice for a secure account.",
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const result = (await response.json()) as ApiResponse<User>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to register." : result.error);
      }

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        toast.success("Account created successfully. Please sign in to continue.");
        router.push("/login?registered=1");
        router.refresh();
        return;
      }

      toast.success(`Welcome, ${name.split(" ")[0] || "friend"}!`);
      router.push("/");
      router.refresh();
    } catch (registrationError) {
      const message =
        registrationError instanceof Error ? registrationError.message : "Unable to register.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(0,480px)] lg:items-center">
      <section className="hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 p-10 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.8)] lg:block">
        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
          Join the giving network
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">
          Create your account and start sharing support with your community.
        </h1>
        <p className="mt-4 text-base leading-8 text-emerald-50/90">
          Sign up to donate useful items, track review status, and submit claims for charities,
          shelters, and grassroots organisations.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-emerald-50/80">Fast approval flow</p>
            <p className="mt-2 text-xl font-semibold text-white">Clear moderation</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-emerald-50/80">Trusted claims</p>
            <p className="mt-2 text-xl font-semibold text-white">Connect with verified donors</p>
          </div>
        </div>
      </section>

      <div className="w-full rounded-[2.25rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Create your account</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Register once, then browse, donate, and claim community support more easily.
          </p>
        </div>

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
          <span>Email registration</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="Jane Doe"
            />
          </label>

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

          <div className="space-y-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder="Minimum 6 characters"
              />
            </label>

            <div className="grid grid-cols-4 gap-2" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => {
                const isActive = passwordStrength.score > index;
                const activeClassName =
                  passwordStrength.score <= 1
                    ? "bg-rose-400"
                    : passwordStrength.score === 2
                      ? "bg-amber-400"
                      : "bg-emerald-500";

                return (
                  <span
                    key={index}
                    className={`h-2 rounded-full ${isActive ? activeClassName : "bg-slate-200 dark:bg-slate-700"}`}
                  />
                );
              })}
            </div>

            <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{passwordStrength.label}</span>
              <span className="text-slate-500 dark:text-slate-400">{passwordStrength.hint}</span>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
          >
            {isSubmitting ? "Registering…" : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
