import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { adminListingModerationSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    if (session.user.role !== "ADMIN") {
      return apiError("Admin access required.", 403);
    }

    const listings = await prisma.listing.findMany({
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            claims: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return apiSuccess(listings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    if (session.user.role !== "ADMIN") {
      return apiError("Admin access required.", 403);
    }

    const payload = adminListingModerationSchema.parse(await request.json());
    const listing = await prisma.listing.findUnique({ where: { id: payload.id } });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    const updatedListing = await prisma.listing.update({
      where: { id: payload.id },
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

    return apiSuccess(updatedListing, {
      message: `Listing ${payload.status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
