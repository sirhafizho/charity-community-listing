import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_IN_MS = 86_400_000;

type BadgeProgress = {
  itemsDonated: number;
  itemsClaimed: number;
};

const badgeDefinitions = [
  {
    id: "first-share",
    name: "First Share",
    description: "Shared your first item with the community.",
    icon: "🎁",
    requirement: ({ itemsDonated }: BadgeProgress) => itemsDonated >= 1,
  },
  {
    id: "generous-giver",
    name: "Generous Giver",
    description: "Donated five items to neighbors in need.",
    icon: "💚",
    requirement: ({ itemsDonated }: BadgeProgress) => itemsDonated >= 5,
  },
  {
    id: "community-hero",
    name: "Community Hero",
    description: "Reached ten shared items.",
    icon: "🌟",
    requirement: ({ itemsDonated }: BadgeProgress) => itemsDonated >= 10,
  },
  {
    id: "legendary-donor",
    name: "Legendary Donor",
    description: "Shared twenty-five items with the community.",
    icon: "🏆",
    requirement: ({ itemsDonated }: BadgeProgress) => itemsDonated >= 25,
  },
  {
    id: "helper",
    name: "Helper",
    description: "Completed your first fulfilled claim.",
    icon: "🤝",
    requirement: ({ itemsClaimed }: BadgeProgress) => itemsClaimed >= 1,
  },
  {
    id: "active-helper",
    name: "Active Helper",
    description: "Completed five fulfilled claims.",
    icon: "🙌",
    requirement: ({ itemsClaimed }: BadgeProgress) => itemsClaimed >= 5,
  },
] as const;

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const [user, itemsDonated, peopleHelped, itemsClaimed] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { createdAt: true },
      }),
      prisma.listing.count({
        where: {
          userId: session.user.id,
          status: { in: ["APPROVED", "CLAIMED", "FULFILLED"] },
        },
      }),
      prisma.claim.count({
        where: {
          status: "FULFILLED",
          listing: {
            userId: session.user.id,
          },
        },
      }),
      prisma.claim.count({
        where: {
          userId: session.user.id,
          status: "FULFILLED",
        },
      }),
    ]);

    if (!user) {
      return apiError("User not found.", 404);
    }

    const daysActive = Math.max(0, Math.floor((Date.now() - user.createdAt.getTime()) / DAY_IN_MS));
    const totalDonationValue = itemsDonated;
    const badges = badgeDefinitions.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned: badge.requirement({ itemsDonated, itemsClaimed }),
    }));

    return apiSuccess({
      itemsDonated,
      peopleHelped,
      daysActive,
      itemsClaimed,
      totalDonationValue,
      badges,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
