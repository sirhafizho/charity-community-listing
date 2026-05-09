import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import ClaimForm from "@/components/forms/ClaimForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const getStatusClassName = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const session = await auth();

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      category: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!listing) {
    notFound();
  }

  const canViewPrivate =
    session?.user.role === "ADMIN" || session?.user.id === listing.userId;

  if (listing.status !== "APPROVED" && !canViewPrivate) {
    notFound();
  }

  const existingClaim = session?.user.id
    ? await prisma.claim.findFirst({
        where: {
          listingId: listing.id,
          userId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr,0.9fr]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-80 bg-slate-100 sm:h-[28rem]">
          {listing.image ? (
            <Image src={listing.image} alt={listing.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-7xl text-sky-700">
              🎁
            </div>
          )}
        </div>

        <div className="space-y-6 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
              {listing.category.name}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              📍 {listing.location}
            </span>
            {canViewPrivate ? (
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClassName(listing.status)}`}>
                {listing.status}
              </span>
            ) : null}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{listing.title}</h1>
            <p className="mt-3 text-sm text-slate-500">
              Shared by {listing.user.name} on {listing.createdAt.toLocaleDateString()}
            </p>
          </div>

          <p className="whitespace-pre-line text-base leading-8 text-slate-700">{listing.description}</p>
        </div>
      </section>

      <aside className="space-y-6">
        {session?.user ? (
          existingClaim ? (
            <div className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-sm text-sky-800">
              <h2 className="text-lg font-semibold">Your claim is already submitted</h2>
              <p className="mt-2">
                Current status: <span className="font-semibold">{existingClaim.status}</span>
              </p>
              {existingClaim.message ? (
                <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-slate-700">{existingClaim.message}</p>
              ) : null}
            </div>
          ) : (
            <ClaimForm listingId={listing.id} disabled={session.user.id === listing.userId} />
          )
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Want to claim this item?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to contact the donor and submit a claim request.
            </p>
            <Link
              href={`/login?callbackUrl=/listings/${listing.id}`}
              className="mt-5 inline-flex rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Login to claim
            </Link>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Need more details?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Submit a claim request and the donor can follow up with collection or delivery information.
          </p>
        </div>
      </aside>
    </div>
  );
}
