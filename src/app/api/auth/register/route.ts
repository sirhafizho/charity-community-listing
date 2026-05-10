import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createUserSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = checkRateLimit(`register:${ip}`, 20, 60_000);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const payload = createUserSchema.parse(await request.json());
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      return apiError("A user with this email already exists.", 409);
    }

    const password = await hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(user, {
      status: 201,
      message: "Account created successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
