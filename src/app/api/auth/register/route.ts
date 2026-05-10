import { hash } from "bcryptjs";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { createUserSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success } = checkRateLimit(
      `register:${ip}`,
      RATE_LIMITS.register.limit,
      RATE_LIMITS.register.windowMs,
    );

    if (!success) {
      return apiError("Too many registration attempts. Please try again later.", 429);
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
