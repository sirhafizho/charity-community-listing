import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ApiTestResponse, parseJson } from "../helpers/api";
import { createSession, mockAuth, mockPrisma, resetTestMocks } from "../helpers/mocks";

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

let GET: typeof import("@/app/api/users/me/impact/route").GET;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/users/me/impact/route"));
});

describe("/api/users/me/impact", () => {
  beforeEach(() => {
    resetTestMocks();
    mockPrisma.claim.count = jest.fn();
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("returns not found when the user no longer exists", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.listing.count.mockResolvedValue(0);
    mockPrisma.claim.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "User not found.",
    });
  });

  it("returns impact stats and badges for authenticated users", async () => {
    const createdAt = new Date(Date.now() - 7 * 86_400_000);

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.user.findUnique.mockResolvedValue({ createdAt });
    mockPrisma.listing.count.mockResolvedValue(5);
    mockPrisma.claim.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: true,
      data: {
        itemsDonated: 5,
        peopleHelped: 2,
        daysActive: 7,
        itemsClaimed: 1,
        totalDonationValue: 5,
        badges: [
          {
            id: "first-share",
            name: "First Share",
            description: "Shared your first item with the community.",
            icon: "🎁",
            earned: true,
          },
          {
            id: "generous-giver",
            name: "Generous Giver",
            description: "Donated five items to neighbors in need.",
            icon: "💚",
            earned: true,
          },
          {
            id: "community-hero",
            name: "Community Hero",
            description: "Reached ten shared items.",
            icon: "🌟",
            earned: false,
          },
          {
            id: "legendary-donor",
            name: "Legendary Donor",
            description: "Shared twenty-five items with the community.",
            icon: "🏆",
            earned: false,
          },
          {
            id: "helper",
            name: "Helper",
            description: "Completed your first fulfilled claim.",
            icon: "🤝",
            earned: true,
          },
          {
            id: "active-helper",
            name: "Active Helper",
            description: "Completed five fulfilled claims.",
            icon: "🙌",
            earned: false,
          },
        ],
      },
    });
  });
});
