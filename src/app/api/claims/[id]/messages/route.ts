import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { createClaimMessageSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const claimMessageInclude = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { id } = await params;
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!claim) {
      return apiError("Claim not found.", 404);
    }

    const canAccess = session.user.id === claim.userId || session.user.id === claim.listing.userId;

    if (!canAccess) {
      return apiError("You do not have permission to view these messages.", 403);
    }

    const messages = await prisma.claimMessage.findMany({
      where: { claimId: id },
      include: claimMessageInclude,
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess(messages);
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
    const payload = createClaimMessageSchema.parse(await request.json());

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            userId: true,
            title: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!claim) {
      return apiError("Claim not found.", 404);
    }

    const canAccess = session.user.id === claim.userId || session.user.id === claim.listing.userId;

    if (!canAccess) {
      return apiError("You do not have permission to post messages on this claim.", 403);
    }

    if (claim._count.messages >= 5) {
      return apiError("This claim already has the maximum number of messages.", 400);
    }

    const message = await prisma.$transaction(async (tx) => {
      const currentClaim = await tx.claim.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
      });

      if (!currentClaim) {
        throw new Error("CLAIM_NOT_FOUND");
      }

      if (currentClaim._count.messages >= 5) {
        throw new Error("MESSAGE_LIMIT_REACHED");
      }

      return tx.claimMessage.create({
        data: {
          claimId: id,
          userId: session.user.id,
          content: payload.content,
        },
        include: claimMessageInclude,
      });
    });

    const recipientId = session.user.id === claim.userId ? claim.listing.userId : claim.userId;

    await createNotification({
      userId: recipientId,
      type: "CLAIM_MESSAGE",
      title: "New claim message",
      message: `${session.user.name ?? "A community member"} sent a new message about ${claim.listing.title}.`,
      link: `/listings/${claim.listing.id}`,
    });

    return apiSuccess(message, {
      status: 201,
      message: "Message sent.",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CLAIM_NOT_FOUND") {
        return apiError("Claim not found.", 404);
      }

      if (error.message === "MESSAGE_LIMIT_REACHED") {
        return apiError("This claim already has the maximum number of messages.", 400);
      }
    }

    return handleApiError(error);
  }
}
