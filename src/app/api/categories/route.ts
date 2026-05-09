import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return apiSuccess(categories);
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

    if (session.user.role !== "ADMIN") {
      return apiError("Admin access required.", 403);
    }

    const payload = createCategorySchema.parse(await request.json());
    const existingCategory = await prisma.category.findUnique({
      where: { name: payload.name },
    });

    if (existingCategory) {
      return apiError("A category with this name already exists.", 409);
    }

    const category = await prisma.category.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        icon: payload.icon ?? null,
      },
    });

    return apiSuccess(category, {
      status: 201,
      message: "Category created successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
