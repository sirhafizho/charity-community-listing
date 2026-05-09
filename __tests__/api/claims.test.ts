import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  createGetRequest,
  createJsonRequest,
  createRouteContext,
  parseJson,
  ApiTestResponse,
} from "../helpers/api";
import { createSession, mockAuth, mockPrisma, resetTestMocks } from "../helpers/mocks";

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

let GET: typeof import("@/app/api/claims/route").GET;
let POST: typeof import("@/app/api/claims/route").POST;
let PUT: typeof import("@/app/api/claims/[id]/route").PUT;

beforeAll(async () => {
  ({ GET, POST } = await import("@/app/api/claims/route"));
  ({ PUT } = await import("@/app/api/claims/[id]/route"));
});

describe("/api/claims", () => {
  beforeEach(() => {
    resetTestMocks();
  });

  it("requires authentication to create a claim", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      createJsonRequest("http://localhost/api/claims", "POST", {
        listingId: "listing-1",
      }),
    );

    expect(response.status).toBe(401);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("creates a claim for an approved listing", async () => {
    const claim = {
      id: "claim-1",
      status: "PENDING",
      user: { id: "user-2", name: "Claimant", email: "claimant@example.com" },
      listing: { id: "listing-1", category: { id: "cat-1", name: "Clothing" } },
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: "listing-1",
      status: "APPROVED",
      userId: "user-1",
      title: "Winter Coat",
    });
    mockPrisma.claim.findFirst.mockResolvedValue(null);
    mockPrisma.claim.create.mockResolvedValue(claim);

    const response = await POST(
      createJsonRequest("http://localhost/api/claims", "POST", {
        listingId: "listing-1",
        message: "  We can pick it up tomorrow.  ",
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(201);
    expect(json).toEqual({
      success: true,
      data: claim,
      message: "Claim submitted for Winter Coat.",
    });
    expect(mockPrisma.claim.create).toHaveBeenCalledWith({
      data: {
        listingId: "listing-1",
        userId: "user-2",
        message: "We can pick it up tomorrow.",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        listing: {
          include: {
            category: true,
          },
        },
      },
    });
  });

  it("prevents users from claiming their own listing", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: "listing-1",
      status: "APPROVED",
      userId: "user-1",
      title: "Winter Coat",
    });

    const response = await POST(
      createJsonRequest("http://localhost/api/claims", "POST", {
        listingId: "listing-1",
      }),
    );

    expect(response.status).toBe(400);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "You cannot claim your own listing.",
    });
  });

  it("prevents duplicate active claims", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: "listing-1",
      status: "APPROVED",
      userId: "user-1",
      title: "Winter Coat",
    });
    mockPrisma.claim.findFirst.mockResolvedValue({ id: "claim-1", status: "PENDING" });

    const response = await POST(
      createJsonRequest("http://localhost/api/claims", "POST", {
        listingId: "listing-1",
      }),
    );

    expect(response.status).toBe(409);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "You already have an active claim for this listing.",
    });
  });

  it("returns the authenticated user's claims", async () => {
    const claims = [
      {
        id: "claim-1",
        status: "PENDING",
        listing: {
          id: "listing-1",
          category: { id: "cat-1", name: "Clothing" },
          user: { id: "user-1", name: "Owner", email: "owner@example.com" },
        },
      },
    ];

    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.claim.findMany.mockResolvedValue(claims);

    const response = await GET(createGetRequest("http://localhost/api/claims"));
    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, data: claims });
    expect(mockPrisma.claim.findMany).toHaveBeenCalledWith({
      where: { userId: "user-2" },
      include: {
        listing: {
          include: {
            category: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("allows listing owners to view claims for their listing", async () => {
    const claims = [
      {
        id: "claim-1",
        status: "PENDING",
        user: { id: "user-2", name: "Claimant", email: "claimant@example.com" },
        listing: { id: "listing-1", category: { id: "cat-1", name: "Clothing" } },
      },
    ];

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", userId: "user-1" });
    mockPrisma.claim.findMany.mockResolvedValue(claims);

    const response = await GET(
      createGetRequest("http://localhost/api/claims?listingId=listing-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, data: claims });
    expect(mockPrisma.claim.findMany).toHaveBeenCalledWith({
      where: { listingId: "listing-1" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        listing: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("rejects unrelated users from viewing listing claims", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-3" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", userId: "user-1" });

    const response = await GET(
      createGetRequest("http://localhost/api/claims?listingId=listing-1"),
    );

    expect(response.status).toBe(403);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "You do not have permission to view these claims.",
    });
  });

  it("allows listing owners to update claim status", async () => {
    const updatedClaim = {
      id: "claim-1",
      status: "APPROVED",
      user: { id: "user-2", name: "Claimant", email: "claimant@example.com" },
      listing: { id: "listing-1", category: { id: "cat-1", name: "Clothing" } },
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.claim.findUnique.mockResolvedValue({
      id: "claim-1",
      listing: {
        id: "listing-1",
        userId: "user-1",
        title: "Winter Coat",
      },
    });
    mockPrisma.claim.update.mockResolvedValue(updatedClaim);

    const response = await PUT(
      createJsonRequest("http://localhost/api/claims/claim-1", "PUT", {
        status: "APPROVED",
      }),
      createRouteContext("claim-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: updatedClaim,
      message: "Claim for Winter Coat updated to approved.",
    });
    expect(mockPrisma.claim.update).toHaveBeenCalledWith({
      where: { id: "claim-1" },
      data: {
        status: "APPROVED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        listing: {
          include: {
            category: true,
          },
        },
      },
    });
  });
});
