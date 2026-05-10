import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { updateListingStatusSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    if (session.user.role !== "ADMIN") {
      return apiError("Admin access required.", 403);
    }

    const { id } = await params;
    const payload = updateListingStatusSchema.parse(await request.json());
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    // State transition guard: only allow valid transitions
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ["APPROVED", "REJECTED"],
      APPROVED: ["REJECTED"],    // Admin can reject, but claim system handles CLAIMED
      REJECTED: ["APPROVED"],    // Admin can re-approve a rejected listing
      // CLAIMED and FULFILLED are terminal for admin — only claim lifecycle can change them
    };

    const allowed = allowedTransitions[listing.status];
    if (!allowed || !allowed.includes(payload.status)) {
      return apiError(
        `Cannot change listing from ${listing.status} to ${payload.status}. ${
          listing.status === "CLAIMED" || listing.status === "FULFILLED"
            ? "This listing is already in the claim lifecycle."
            : "Invalid status transition."
        }`,
        409,
      );
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: {
        status: payload.status,
      },
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
    });

    await createNotification({
      userId: updatedListing.userId,
      type: payload.status === "APPROVED" ? "LISTING_APPROVED" : "LISTING_REJECTED",
      title: payload.status === "APPROVED" ? "Listing approved" : "Listing rejected",
      message:
        payload.status === "APPROVED"
          ? `${updatedListing.title} is now live for the community to browse.`
          : `${updatedListing.title} was not approved. Please review it and try again.`,
      link: `/listings/${updatedListing.id}`,
    });

    return apiSuccess(updatedListing, {
      message: `Listing ${payload.status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
