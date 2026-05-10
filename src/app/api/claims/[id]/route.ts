import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { updateClaimStatusSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const claimDetailsInclude = {
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
  messages: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  gratitudeNote: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

function getPickupMessage(pickupAt: Date | null | undefined) {
  return pickupAt ? ` Pickup is scheduled for ${pickupAt.toLocaleString()}.` : "";
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { success } = checkRateLimit(
      `claim:update:${session.user.id}`,
      RATE_LIMITS.updateClaim.limit,
      RATE_LIMITS.updateClaim.windowMs,
    );
    if (!success) {
      return apiError("Too many requests. Please slow down.", 429);
    }

    const { id } = await params;
    const payload = updateClaimStatusSchema.parse(await request.json());

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        listing: {
          select: {
            id: true,
            userId: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!claim) {
      return apiError("Claim not found.", 404);
    }

    // State transition guard for claims
    const allowedClaimTransitions: Record<string, string[]> = {
      PENDING: ["APPROVED", "REJECTED"],
      APPROVED: ["FULFILLED", "REJECTED"],
      // REJECTED and FULFILLED are terminal
    };

    const allowedNext = allowedClaimTransitions[claim.status];
    if (!allowedNext || !allowedNext.includes(payload.status)) {
      return apiError(
        `Cannot change claim from ${claim.status} to ${payload.status}. ${
          claim.status === "FULFILLED"
            ? "This claim has already been fulfilled."
            : claim.status === "REJECTED"
              ? "This claim has already been rejected."
              : "Invalid status transition."
        }`,
        409,
      );
    }

    // Prevent approving a claim if the listing already has an approved/claimed claim
    if (payload.status === "APPROVED") {
      const existingApproved = await prisma.claim.findFirst({
        where: {
          listingId: claim.listingId,
          id: { not: id },
          status: { in: ["APPROVED", "FULFILLED"] },
        },
        select: { id: true },
      });

      if (existingApproved) {
        return apiError(
          "This listing already has an approved claim. Only one claim can be active at a time.",
          409,
        );
      }
    }

    const canManageClaim =
      session.user.role === "ADMIN" || session.user.id === claim.listing.userId;

    if (!canManageClaim) {
      return apiError("You do not have permission to update this claim.", 403);
    }

    const outcome = await prisma.$transaction(async (tx) => {
      let rejectedClaims: Array<{ id: string; userId: string }> = [];

      if (payload.status === "APPROVED") {
        rejectedClaims = await tx.claim.findMany({
          where: {
            listingId: claim.listingId,
            id: { not: id },
            status: "PENDING",
          },
          select: {
            id: true,
            userId: true,
          },
        });

        if (rejectedClaims.length > 0) {
          await tx.claim.updateMany({
            where: {
              id: { in: rejectedClaims.map((item) => item.id) },
            },
            data: {
              status: "REJECTED",
            },
          });
        }

        await tx.listing.update({
          where: { id: claim.listing.id },
          data: { status: "CLAIMED" },
        });
      }

      if (payload.status === "FULFILLED") {
        await tx.listing.update({
          where: { id: claim.listing.id },
          data: { status: "FULFILLED" },
        });
      }

      if (payload.status === "REJECTED") {
        const otherApprovedClaim = await tx.claim.findFirst({
          where: {
            listingId: claim.listingId,
            id: { not: id },
            status: "APPROVED",
          },
          select: { id: true },
        });

        if (!otherApprovedClaim) {
          await tx.listing.update({
            where: { id: claim.listing.id },
            data: { status: "APPROVED" },
          });
        }
      }

      await tx.claim.update({
        where: { id },
        data: {
          status: payload.status,
          ...(payload.pickupAt !== undefined ? { pickupAt: payload.pickupAt } : {}),
        },
      });

      const updatedClaim = await tx.claim.findUnique({
        where: { id },
        include: claimDetailsInclude,
      });

      if (!updatedClaim) {
        throw new Error("CLAIM_NOT_FOUND");
      }

      return {
        updatedClaim,
        rejectedClaims,
      };
    });

    if (payload.status === "APPROVED") {
      await Promise.all([
        createNotification({
          userId: outcome.updatedClaim.userId,
          type: "CLAIM_APPROVED",
          title: "Claim approved",
          message: `Your claim for ${claim.listing.title} was approved.${getPickupMessage(outcome.updatedClaim.pickupAt)}`,
          link: `/listings/${claim.listing.id}`,
        }),
        ...outcome.rejectedClaims.map((rejectedClaim) =>
          createNotification({
            userId: rejectedClaim.userId,
            type: "CLAIM_REJECTED",
            title: "Claim update",
            message: `Your claim for ${claim.listing.title} was not approved. Another recipient was selected.`,
            link: `/listings/${claim.listing.id}`,
          }),
        ),
      ]);
    }

    if (payload.status === "FULFILLED") {
      await createNotification({
        userId: outcome.updatedClaim.userId,
        type: "CLAIM_FULFILLED",
        title: "Claim fulfilled",
        message: `Your claim for ${claim.listing.title} was marked as fulfilled.`,
        link: `/listings/${claim.listing.id}`,
      });
    }

    if (payload.status === "REJECTED") {
      await createNotification({
        userId: outcome.updatedClaim.userId,
        type: "CLAIM_REJECTED",
        title: "Claim update",
        message: `Your claim for ${claim.listing.title} was not approved this time.`,
        link: `/listings/${claim.listing.id}`,
      });
    }

    return apiSuccess(outcome.updatedClaim, {
      message: `Claim for ${claim.listing.title} updated to ${payload.status.toLowerCase()}.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLAIM_NOT_FOUND") {
      return apiError("Claim not found.", 404);
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { id } = await params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!claim) {
      return apiError("Claim not found.", 404);
    }

    const isOwner = session.user.id === claim.userId;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return apiError("You do not have permission to delete this claim.", 403);
    }

    if (isOwner && claim.status !== "PENDING") {
      return apiError("Only pending claims can be withdrawn.", 400);
    }

    await prisma.claim.delete({ where: { id } });

    return apiSuccess(null, { message: "Claim withdrawn successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
