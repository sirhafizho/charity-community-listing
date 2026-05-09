import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { updateListingSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
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
        _count: {
          select: {
            claims: true,
          },
        },
      },
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    const canManage =
      session?.user?.role === "ADMIN" || session?.user?.id === listing.userId;

    if (listing.status !== "APPROVED" && !canManage) {
      return apiError("Listing not found.", 404);
    }

    const claims = canManage
      ? await prisma.claim.findMany({
          where: { listingId: listing.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : undefined;

    return apiSuccess({
      ...listing,
      ...(claims ? { claims } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { id } = await params;
    const existingListing = await prisma.listing.findUnique({ where: { id } });

    if (!existingListing) {
      return apiError("Listing not found.", 404);
    }

    if (existingListing.userId !== session.user.id) {
      return apiError("Only the listing owner can update this listing.", 403);
    }

    const payload = updateListingSchema.parse(await request.json());

    if (payload.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: payload.categoryId },
      });

      if (!category) {
        return apiError("Category not found.", 404);
      }
    }

    const data: Record<string, unknown> = {
      status: "PENDING",
    };

    if (payload.title !== undefined) data.title = payload.title;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.location !== undefined) data.location = payload.location;
    if (payload.categoryId !== undefined) data.category = { connect: { id: payload.categoryId } };
    if ("image" in payload) data.image = payload.image ?? null;

    const updatedListing = await prisma.listing.update({
      where: { id },
      data,
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

    return apiSuccess(updatedListing, {
      message: "Listing updated and sent back for review.",
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
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    const canDelete =
      session.user.role === "ADMIN" || session.user.id === listing.userId;

    if (!canDelete) {
      return apiError("You do not have permission to delete this listing.", 403);
    }

    await prisma.listing.delete({ where: { id } });

    return apiSuccess({ id }, { message: "Listing deleted successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
