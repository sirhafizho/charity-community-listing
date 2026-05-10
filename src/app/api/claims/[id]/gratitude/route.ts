import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createGratitudeNoteSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const gratitudeNoteInclude = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const gratitudeNote = await prisma.gratitudeNote.findUnique({
      where: { claimId: id },
      include: gratitudeNoteInclude,
    });

    if (!gratitudeNote) {
      return apiError("Gratitude note not found.", 404);
    }

    return apiSuccess(gratitudeNote);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { id } = await params;
    const payload = createGratitudeNoteSchema.parse(await request.json());
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        gratitudeNote: true,
      },
    });

    if (!claim) {
      return apiError("Claim not found.", 404);
    }

    if (session.user.id !== claim.userId) {
      return apiError("Only the claim owner can share a gratitude note.", 403);
    }

    if (claim.status !== "FULFILLED") {
      return apiError("Gratitude notes can only be added to fulfilled claims.", 400);
    }

    if (claim.gratitudeNote) {
      return apiError("A gratitude note has already been shared for this claim.", 409);
    }

    const gratitudeNote = await prisma.gratitudeNote.create({
      data: {
        claimId: id,
        userId: session.user.id,
        content: payload.content,
      },
      include: gratitudeNoteInclude,
    });

    return apiSuccess(gratitudeNote, {
      status: 201,
      message: "Gratitude note shared.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("A gratitude note has already been shared for this claim.", 409);
    }

    return handleApiError(error);
  }
}
