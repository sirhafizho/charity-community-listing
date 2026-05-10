import { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateReportStatusSchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED"]),
});

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    if (session.user.role !== "ADMIN") {
      return apiError("You do not have permission to update reports.", 403);
    }

    const { id } = await params;
    const payload = updateReportStatusSchema.parse(await request.json());

    const existingReport = await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!existingReport) {
      return apiError("Report not found.", 404);
    }

    const report = await prisma.report.update({
      where: { id },
      data: { status: payload.status },
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
    });

    return apiSuccess(report, {
      message: `Report for ${existingReport.listing.title} marked as ${payload.status.toLowerCase()}.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
