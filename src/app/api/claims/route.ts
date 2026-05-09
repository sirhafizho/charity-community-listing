import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createClaimSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const listingId = request.nextUrl.searchParams.get("listingId")?.trim();

    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { id: true, userId: true },
      });

      if (!listing) {
        return apiError("Listing not found.", 404);
      }

      const canViewListingClaims =
        session.user.role === "ADMIN" || session.user.id === listing.userId;

      if (!canViewListingClaims) {
        return apiError("You do not have permission to view these claims.", 403);
      }

      const claims = await prisma.claim.findMany({
        where: { listingId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          listing: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return apiSuccess(claims);
    }

    const claims = await prisma.claim.findMany({
      where: { userId: session.user.id },
      include: {
        listing: {
          include: {
            category: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(claims);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const payload = createClaimSchema.parse(await request.json());
    const listing = await prisma.listing.findUnique({
      where: { id: payload.listingId },
      select: {
        id: true,
        status: true,
        userId: true,
        title: true,
      },
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    if (listing.status !== "APPROVED") {
      return apiError("Claims can only be created for approved listings.", 400);
    }

    if (listing.userId === session.user.id) {
      return apiError("You cannot claim your own listing.", 400);
    }

    const existingClaim = await prisma.claim.findFirst({
      where: {
        listingId: payload.listingId,
        userId: session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existingClaim) {
      return apiError("You already have an active claim for this listing.", 409);
    }

    const claim = await prisma.$transaction(async (tx) => {
      // Double-check within transaction to prevent race condition
      const duplicate = await tx.claim.findFirst({
        where: {
          listingId: payload.listingId,
          userId: session.user.id,
          status: { in: ["PENDING", "APPROVED"] },
        },
      });
      if (duplicate) {
        throw new Error("DUPLICATE_CLAIM");
      }
      return tx.claim.create({
        data: {
          listingId: payload.listingId,
          userId: session.user.id,
          message: payload.message ?? null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          listing: {
            include: {
              category: true,
            },
          },
        },
      });
    });

    return apiSuccess(claim, {
      status: 201,
      message: `Claim submitted for ${listing.title}.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_CLAIM") {
      return apiError("You already have an active claim for this listing.", 409);
    }
    return handleApiError(error);
  }
}
