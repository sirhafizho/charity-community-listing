import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { updateClaimStatusSchema } from "@/lib/validations";

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

    const { id } = await params;
    const payload = updateClaimStatusSchema.parse(await request.json());

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            userId: true,
            title: true,
          },
        },
      },
    });

    if (!claim) {
      return apiError("Claim not found.", 404);
    }

    const canManageClaim =
      session.user.role === "ADMIN" || session.user.id === claim.listing.userId;

    if (!canManageClaim) {
      return apiError("You do not have permission to update this claim.", 403);
    }

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        status: payload.status,
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

    return apiSuccess(updatedClaim, {
      message: `Claim for ${claim.listing.title} updated to ${payload.status.toLowerCase()}.`,
    });
  } catch (error) {
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
