import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, getPaginationParams, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createListingSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { success } = checkRateLimit(
      `listings:read:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon"}`,
      RATE_LIMITS.readApi.limit,
      RATE_LIMITS.readApi.windowMs,
    );
    if (!success) {
      return apiError("Too many requests. Please slow down.", 429);
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const { page, limit, skip } = getPaginationParams(searchParams);

    const where = {
      status: "APPROVED",
      ...(category ? { categoryId: category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
              { location: { contains: search } },
              { category: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [listings, total] = await prisma.$transaction([
      prisma.listing.findMany({
        where,
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return apiSuccess(listings, {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
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
      `listing:create:${session.user.id}`,
      RATE_LIMITS.createListing.limit,
      RATE_LIMITS.createListing.windowMs,
    );

    if (!success) {
      return apiError("Too many listings. Please slow down.", 429);
    }

    const payload = createListingSchema.parse(await request.json());
    const normalizedTags = Array.from(
      new Set(payload.tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean)),
    );
    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId },
    });

    if (!category) {
      return apiError("Category not found.", 404);
    }

    // Ensure tags exist first, then connect — avoids SQLite FK race with connectOrCreate
    if (normalizedTags.length > 0) {
      await Promise.all(
        normalizedTags.map((tag) =>
          prisma.tag.upsert({ where: { name: tag }, update: {}, create: { name: tag } }),
        ),
      );
    }

    const listing = await prisma.listing.create({
      data: {
        title: payload.title,
        description: payload.description,
        location: payload.location,
        condition: payload.condition,
        image: payload.image ?? null,
        categoryId: payload.categoryId,
        urgency: payload.urgency,
        expiresAt: payload.urgency === "EXPIRING" ? (payload.expiresAt ?? null) : null,
        userId: session.user.id,
        status: "PENDING",
        ...(normalizedTags.length > 0
          ? { tags: { connect: normalizedTags.map((tag) => ({ name: tag })) } }
          : {}),
      },
      include: {
        category: true,
        tags: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return apiSuccess(listing, {
      status: 201,
      message: "Listing submitted and awaiting approval.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
