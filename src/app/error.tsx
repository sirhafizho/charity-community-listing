"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Something went wrong</h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
