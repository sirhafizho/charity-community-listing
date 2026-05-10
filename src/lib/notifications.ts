import { prisma } from "@/lib/prisma";

const VALID_NOTIFICATION_TYPES = [
  "CLAIM_APPROVED",
  "CLAIM_REJECTED",
  "CLAIM_FULFILLED",
  "CLAIM_MESSAGE",
  "LISTING_APPROVED",
  "LISTING_REJECTED",
  "NEW_CLAIM",
] as const;

type NotificationType = (typeof VALID_NOTIFICATION_TYPES)[number];

export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  if (!VALID_NOTIFICATION_TYPES.includes(data.type)) {
    throw new Error(`Invalid notification type: ${data.type}`);
  }
  return prisma.notification.create({ data });
}
