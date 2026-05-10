import Link from "next/link";

import ListingCard from "@/components/ListingCard";
import ListingFilter from "@/components/ListingFilter";
import { prisma } from "@/lib/prisma";
import type { ListingCardData } from "@/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 6;

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function getCurrentPage(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return Math.floor(parsedValue);
}

function getPageHref(search: string, category: string, page: number) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (category) {
    params.set("category", category);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  return params.toString() ? `/?${params.toString()}` : "/";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const search = getSingleParam(params.search).trim();
  const category = getSingleParam(params.category);
  const currentPage = getCurrentPage(getSingleParam(params.page));
  const hasFilters = Boolean(search || category);

  const where = {
    status: "APPROVED",
    ...(category ? { categoryId: category } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { location: { contains: search } },
            { category: { name: { contains: search } } },
          ],
        }
      : {}),
  };

  const [categories, totalApprovedCount, urgentCount, filteredCount, listings] = await prisma.$transaction([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.listing.count({
      where: {
        status: "APPROVED",
      },
    }),
    prisma.listing.count({
      where: {
        status: "APPROVED",
        urgency: {
          in: ["URGENT", "EXPIRING"],
        },
      },
    }),
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      take: currentPage * PAGE_SIZE,
    }),
  ]);

  const listingCards: ListingCardData[] = listings.map((listing) => ({
    ...listing,
    status: listing.status as ListingCardData["status"],
    urgency: listing.urgency as ListingCardData["urgency"],
  }));

  const hasMore = filteredCount > listingCards.length;
  const selectedCategoryName = categories.find((item) => item.id === category)?.name;
  const resultCopy = hasFilters
    ? `Showing ${listingCards.length} of ${filteredCount} matched ${filteredCount === 1 ? "donation" : "donations"}${selectedCategoryName ? ` in ${selectedCategoryName}` : ""}.`
    : `Showing ${listingCards.length} approved donations ready for local pickup right now.`;

  return (
    <div className="space-y-10 pb-16">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 px-6 py-10 text-white shadow-[0_32px_80px_-32px_rgba(15,23,42,0.85)] sm:px-10 lg:px-12 lg:py-14">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] xl:items-end">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              Trusted community giving
            </span>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Share essentials faster, and help every donation reach the right neighbour.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-emerald-50/90">
                Browse approved items from local donors, filter by need, and claim support for your charity,
                shelter, or community project in minutes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/listings/create"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-lg transition hover:bg-emerald-50 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400"
              >
                Share a donation
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View your dashboard
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-emerald-50/80">Approved donations</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totalApprovedCount}</p>
                <p className="mt-1 text-sm text-emerald-50/75">Ready for charities and community groups.</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-emerald-50/80">Urgent opportunities</p>
                <p className="mt-3 text-3xl font-semibold text-white">{urgentCount}</p>
                <p className="mt-1 text-sm text-emerald-50/75">High-priority items highlighted with amber badges.</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-emerald-50/80">Browse categories</p>
                <p className="mt-3 text-3xl font-semibold text-white">{categories.length}</p>
                <p className="mt-1 text-sm text-emerald-50/75">From food and books to furniture and essentials.</p>
              </div>
            </div>
          </div>

          <ListingFilter
            key={`${search}:${category}`}
            categories={categories}
            initialSearch={search}
            initialCategory={category}
          />
        </div>
      </section>

      <section id="listings" className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              Live catalogue
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Discover approved donations near you
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{resultCopy}</p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {selectedCategoryName ? `Category: ${selectedCategoryName}` : "All categories"}
          </div>
        </div>

        {listingCards.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No donations matched your search yet.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Try a broader keyword or clear the current filters to see everything available.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listingCards.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {hasMore ? (
              <div className="flex justify-center pt-2">
                <Link
                  href={getPageHref(search, category, currentPage + 1)}
                  scroll={false}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
                >
                  Load more donations
                </Link>
              </div>
            ) : filteredCount > PAGE_SIZE ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                You&apos;ve reached the end of the current results.
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
