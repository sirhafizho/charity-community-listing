import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createReportSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const createReportRequestSchema = createReportSchema.extend({
  listingId: z.string().trim().min(1, "Listing is required."),
});

const reportStatusSchema = z.enum(["PENDING", "REVIEWED", "DISMISSED"]);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    if (session.user.role !== "ADMIN") {
      return apiError("You do not have permission to view reports.", 403);
    }

    const statusParam = request.nextUrl.searchParams.get("status")?.trim();
    const status = statusParam ? reportStatusSchema.parse(statusParam) : undefined;

    const reports = await prisma.report.findMany({
      where: status ? { status } : undefined,
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
            title: true,
            status: true,
            condition: true,
            location: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
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

    return apiSuccess(reports);
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

    const { success } = checkRateLimit(
      `report:create:${session.user.id}`,
      RATE_LIMITS.createReport.limit,
      RATE_LIMITS.createReport.windowMs,
    );
    if (!success) {
      return apiError("Too many reports. Please slow down.", 429);
    }

    const payload = createReportRequestSchema.parse(await request.json());
    const listing = await prisma.listing.findUnique({
      where: { id: payload.listingId },
      select: {
        id: true,
        title: true,
      },
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        listingId: payload.listingId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (existingReport) {
      return apiError("You have already reported this listing.", 409);
    }

    const report = await prisma.report.create({
      data: {
        reason: payload.reason,
        details: payload.details ?? null,
        listingId: payload.listingId,
        userId: session.user.id,
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
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return apiSuccess(report, {
      status: 201,
      message: `Report submitted for ${listing.title}.`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("You have already reported this listing.", 409);
    }

    return handleApiError(error);
  }
}
