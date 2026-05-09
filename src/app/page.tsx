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

  const where = {
    status: "APPROVED",
    ...(category ? { categoryId: category } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { location: { contains: search } },
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
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const listingCards: ListingCardData[] = listings.map((listing) => ({
    ...listing,
    status: listing.status as ListingCardData["status"],
  }));

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-700 via-sky-600 to-indigo-700 px-8 py-14 text-white shadow-xl sm:px-12">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
            Community-powered giving
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Help good items reach the people who need them most.
          </h1>
          <p className="max-w-2xl text-lg text-sky-50">
            Browse approved donations, connect with local charities, and share items with your community.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/listings/create"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
            >
              Share an item
            </Link>
            <a
              href="#listings"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore listings
            </a>
          </div>
        </div>
      </section>

      <section id="listings" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Approved listings</h2>
            <p className="text-sm text-slate-600">
              Search by keyword or narrow results to a specific category.
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-sky-700 transition hover:text-sky-800">
            Clear filters
          </Link>
        </div>

        <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[2fr,1fr,auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Search</span>
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search by title, location, or description"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
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
              className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Apply filters
            </button>
          </div>
        </form>

        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            No approved listings matched your search.
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
