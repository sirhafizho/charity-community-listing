import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { bulkUpdateListingStatusSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    if (session.user.role !== "ADMIN") {
      return apiError("Admin access required.", 403);
    }

    const { success } = checkRateLimit(
      `admin:bulk:${session.user.id}`,
      RATE_LIMITS.adminAction.limit,
      RATE_LIMITS.adminAction.windowMs,
    );
    if (!success) {
      return apiError("Too many bulk actions. Please slow down.", 429);
    }

    const payload = bulkUpdateListingStatusSchema.parse(await request.json());
    const ids = Array.from(new Set(payload.ids));

    if (ids.length === 0) {
      return apiError("No listing IDs provided.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch listings INSIDE transaction for consistency
      const listings = await tx.listing.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, userId: true },
      });

      if (listings.length !== ids.length) {
        throw new Error("One or more listings could not be found.");
      }

      const updateResult = await tx.listing.updateMany({
        where: { id: { in: ids } },
        data: { status: payload.status },
      });

      await tx.notification.createMany({
        data: listings.map((listing) => ({
          userId: listing.userId,
          type: payload.status === "APPROVED" ? "LISTING_APPROVED" : "LISTING_REJECTED",
          title: payload.status === "APPROVED" ? "Listing approved" : "Listing rejected",
          message:
            payload.status === "APPROVED"
              ? `${listing.title} is now live for the community to browse.`
              : `${listing.title} was not approved. Please review it and try again.`,
          link: `/listings/${listing.id}`,
        })),

      });

      return updateResult;
    });

    return apiSuccess({ count: result.count }, { message: `Updated ${result.count} listings.` });
  } catch (error) {
    return handleApiError(error);
  }
}
