import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return apiError("Notification not found.", 404);
    }

    if (notification.userId !== session.user.id) {
      return apiError("You do not have permission to update this notification.", 403);
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return apiSuccess(updatedNotification, { message: "Notification marked as read." });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return apiError("Notification not found.", 404);
    }

    if (notification.userId !== session.user.id) {
      return apiError("You do not have permission to delete this notification.", 403);
    }

    await prisma.notification.delete({ where: { id } });

    return apiSuccess(null, { message: "Notification deleted." });
  } catch (error) {
    return handleApiError(error);
  }
}
