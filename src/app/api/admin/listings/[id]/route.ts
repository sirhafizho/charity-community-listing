import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
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

    return apiSuccess(updatedListing, {
      message: `Listing ${payload.status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
