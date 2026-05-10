"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ListingFilterProps = {
  categories: Array<{
    id: string;
    name: string;
  }>;
  initialSearch?: string;
  initialCategory?: string;
};

const inputClassName =
  "w-full rounded-2xl border border-white/20 bg-white/95 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

export default function ListingFilter({
  categories,
  initialSearch = "",
  initialCategory = "",
}: ListingFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const activeSearch = searchParams.get("search") ?? initialSearch;
  const activeCategory = searchParams.get("category") ?? initialCategory;
  const hasActiveFilters = Boolean(activeSearch || activeCategory);

  const activeCategoryName = useMemo(
    () => categories.find((category) => category.id === activeCategory)?.name ?? "All categories",
    [activeCategory, categories],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const applyFilters = (nextSearch: string, nextCategory: string) => {
    const params = new URLSearchParams();
    const trimmedSearch = nextSearch.trim();

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    startTransition(() => {
      router.push(params.toString() ? `/?${params.toString()}` : "/", { scroll: false });
    });
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    applyFilters(search, categoryId);
  };

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur dark:border-white/10 dark:bg-slate-900/40 sm:p-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100/90">
          Search with purpose
        </p>
        <h2 className="text-2xl font-semibold text-white">Find the right donation faster.</h2>
        <p className="text-sm leading-6 text-emerald-50/90">
          Search by item, location, or organisation need, then narrow results with a single tap.
        </p>
      </div>

      <form
        action="/"
        method="get"
        onSubmit={(event) => {
          event.preventDefault();

          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }

          applyFilters(search, selectedCategory);
        }}
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end"
      >
        <label className="space-y-2">
          <span className="text-sm font-medium text-emerald-50">Search donations</span>
          <input
            type="search"
            name="search"
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              setSearch(value);

              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
              }

              debounceRef.current = setTimeout(() => {
                applyFilters(value, selectedCategory);
              }, 300);
            }}
            placeholder="Books, coats, desks, Brooklyn…"
            className={inputClassName}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/70"
        >
          {isPending ? "Updating…" : "Search"}
        </button>

        <button
          type="button"
          onClick={() => {
            if (debounceRef.current) {
              clearTimeout(debounceRef.current);
            }

            setSearch("");
            setSelectedCategory("");
            applyFilters("", "");
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Clear filters
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/75">
            Quick categories
          </p>
          <p className="text-sm text-emerald-50/90">{hasActiveFilters ? `Active: ${activeCategoryName}` : "Browse all categories"}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCategorySelect("")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedCategory === ""
                ? "bg-white text-emerald-700 shadow-sm"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            All
          </button>
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
