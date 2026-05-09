import Link from "next/link";

import ListingCard from "@/components/ListingCard";
import { prisma } from "@/lib/prisma";
import type { ListingCardData } from "@/types";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const category = typeof params.category === "string" ? params.category : "";
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

  const [categories, listings] = await prisma.$transaction([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.listing.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  const listingCards: ListingCardData[] = listings.map((listing) => ({
    ...listing,
    status: listing.status as ListingCardData["status"],
    urgency: listing.urgency as ListingCardData["urgency"],
  }));

  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-700 via-sky-600 to-indigo-700 px-6 py-12 text-white shadow-xl sm:px-10 lg:px-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] lg:items-end">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
              Community-powered giving
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Help good items reach the people who need them most.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-sky-50">
                Browse trusted donations, connect with local charities, and share useful items with
                your community in just a few clicks.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/listings/create"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800"
              >
                Share an item
              </Link>
              <a
                href="#listings"
                className="rounded-full border-2 border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore listings
              </a>
            </div>
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-sky-950/10 backdrop-blur sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-sky-100/85">Approved listings</p>
              <p className="mt-2 text-3xl font-semibold text-white">{listingCards.length}</p>
              <p className="mt-1 text-sm text-sky-100/75">Freshly reviewed and ready to browse.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-sky-100/85">Categories</p>
              <p className="mt-2 text-3xl font-semibold text-white">{categories.length}</p>
              <p className="mt-1 text-sm text-sky-100/75">From clothing and books to furniture.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-sky-100/85">Local impact</p>
              <p className="mt-2 text-3xl font-semibold text-white">24/7</p>
              <p className="mt-1 text-sm text-sky-100/75">Search, filter, and connect whenever you need.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="listings" className="space-y-6 rounded-[2rem] bg-white/70 p-6 shadow-sm dark:bg-slate-800/60 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
              Approved listings
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Find items ready for community pickup
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Search by keyword or narrow the catalogue to a category. We are showing the latest{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{listingCards.length}</span> approved
              listings right now.
            </p>
          </div>
          <Link
            href="/"
            className={`text-sm font-medium transition ${
              hasFilters ? "text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            Clear filters
          </Link>
        </div>

        <form
          action="/"
          method="GET"
          className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:grid-cols-[2fr,1fr,auto]"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Search</span>
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search by title, location, or description"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Apply filters
            </button>
          </div>
        </form>

        {listings.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-16 text-center text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <p className="text-lg font-medium text-slate-700 dark:text-slate-100">No approved listings matched your search.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Try broadening your keywords or clearing the current filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listingCards.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
