import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  ApiTestResponse,
  createGetRequest,
  createJsonRequest,
  createRouteContext,
  parseJson,
} from "../helpers/api";
import { createSession, mockAuth, mockPrisma, resetTestMocks } from "../helpers/mocks";

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

let GETClaims: typeof import("@/app/api/claims/route").GET;
let POSTClaims: typeof import("@/app/api/claims/route").POST;
let PUTClaim: typeof import("@/app/api/claims/[id]/route").PUT;
let GETClaimMessages: typeof import("@/app/api/claims/[id]/messages/route").GET;
let POSTClaimMessage: typeof import("@/app/api/claims/[id]/messages/route").POST;
let GETGratitude: typeof import("@/app/api/claims/[id]/gratitude/route").GET;
let POSTGratitude: typeof import("@/app/api/claims/[id]/gratitude/route").POST;

beforeAll(async () => {
  ({ GET: GETClaims, POST: POSTClaims } = await import("@/app/api/claims/route"));
  ({ PUT: PUTClaim } = await import("@/app/api/claims/[id]/route"));
  ({ GET: GETClaimMessages, POST: POSTClaimMessage } = await import(
    "@/app/api/claims/[id]/messages/route"
  ));
  ({ GET: GETGratitude, POST: POSTGratitude } = await import(
    "@/app/api/claims/[id]/gratitude/route"
  ));
});

describe("/api/claims", () => {
  beforeEach(() => {
    resetTestMocks();
  });

  it("requires authentication to create a claim", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POSTClaims(
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

    const response = await POSTClaims(
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

    const response = await POSTClaims(
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

    const response = await POSTClaims(
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

  it("returns the authenticated user's claims with claim activity", async () => {
    const claims = [
      {
        id: "claim-1",
        status: "PENDING",
        pickupAt: "2025-01-15T10:00:00.000Z",
        messages: [{ id: "msg-1", content: "Can pick up Friday" }],
        gratitudeNote: { id: "note-1", content: "Thanks!" },
        listing: {
          id: "listing-1",
          category: { id: "cat-1", name: "Clothing" },
          user: { id: "user-1", name: "Owner", email: "owner@example.com" },
        },
      },
    ];

    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.claim.findMany.mockResolvedValue(claims);

    const response = await GETClaims(createGetRequest("http://localhost/api/claims"));
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
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        gratitudeNote: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("allows listing owners to view claims for their listing with activity", async () => {
    const claims = [
      {
        id: "claim-1",
        status: "PENDING",
        pickupAt: null,
        messages: [{ id: "msg-1", content: "Can pick up Friday" }],
        gratitudeNote: null,
        user: { id: "user-2", name: "Claimant", email: "claimant@example.com" },
        listing: { id: "listing-1", category: { id: "cat-1", name: "Clothing" } },
      },
    ];

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", userId: "user-1" });
    mockPrisma.claim.findMany.mockResolvedValue(claims);

    const response = await GETClaims(
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
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        gratitudeNote: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("rejects unrelated users from viewing listing claims", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-3" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", userId: "user-1" });

    const response = await GETClaims(
      createGetRequest("http://localhost/api/claims?listingId=listing-1"),
    );

    expect(response.status).toBe(403);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "You do not have permission to view these claims.",
    });
  });

  it("approves a claim, claims the listing, and rejects other pending claims", async () => {
    const pickupAt = new Date("2025-02-14T15:00:00.000Z");
    const existingClaim = {
      id: "claim-1",
      listingId: "listing-1",
      userId: "user-2",
      status: "PENDING",
      user: { id: "user-2", name: "Claimant", email: "claimant@example.com" },
      listing: {
        id: "listing-1",
        userId: "user-1",
        title: "Winter Coat",
        status: "APPROVED",
      },
    };
    const updatedClaim = {
      id: "claim-1",
      listingId: "listing-1",
      userId: "user-2",
      status: "APPROVED",
      pickupAt,
      user: existingClaim.user,
      listing: { id: "listing-1", category: { id: "cat-1", name: "Clothing" } },
      messages: [],
      gratitudeNote: null,
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.claim.findUnique
      .mockResolvedValueOnce(existingClaim)
      .mockResolvedValueOnce(updatedClaim);
    mockPrisma.claim.findMany.mockResolvedValue([
      { id: "claim-2", userId: "user-3" },
      { id: "claim-3", userId: "user-4" },
    ]);

    const response = await PUTClaim(
      createJsonRequest("http://localhost/api/claims/claim-1", "PUT", {
        status: "APPROVED",
        pickupAt: pickupAt.toISOString(),
      }),
      createRouteContext("claim-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: {
        ...updatedClaim,
        pickupAt: pickupAt.toISOString(),
      },
      message: "Claim for Winter Coat updated to approved.",
    });
    expect(mockPrisma.claim.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["claim-2", "claim-3"] },
      },
      data: {
        status: "REJECTED",
      },
    });
    expect(mockPrisma.claim.update).toHaveBeenCalledWith({
      where: { id: "claim-1" },
      data: {
        status: "APPROVED",
        pickupAt,
      },
    });
    expect(mockPrisma.listing.update).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: { status: "CLAIMED" },
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-2",
        type: "CLAIM_APPROVED",
      }),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-3",
        type: "CLAIM_REJECTED",
        message: expect.stringContaining("Another recipient was selected"),
      }),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-4",
        type: "CLAIM_REJECTED",
      }),
    });
  });

  it("fulfills a claim and updates the listing", async () => {
    const existingClaim = {
      id: "claim-1",
      listingId: "listing-1",
      userId: "user-2",
      status: "APPROVED",
      user: { id: "user-2", name: "Claimant", email: "claimant@example.com" },
      listing: {
        id: "listing-1",
        userId: "user-1",
        title: "Winter Coat",
        status: "CLAIMED",
      },
    };
    const updatedClaim = {
      id: "claim-1",
      listingId: "listing-1",
      userId: "user-2",
      status: "FULFILLED",
      pickupAt: null,
      user: existingClaim.user,
      listing: { id: "listing-1", category: { id: "cat-1", name: "Clothing" } },
      messages: [],
      gratitudeNote: null,
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.claim.findUnique
      .mockResolvedValueOnce(existingClaim)
      .mockResolvedValueOnce(updatedClaim);

    const response = await PUTClaim(
      createJsonRequest("http://localhost/api/claims/claim-1", "PUT", {
        status: "FULFILLED",
      }),
      createRouteContext("claim-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: updatedClaim,
      message: "Claim for Winter Coat updated to fulfilled.",
    });
    expect(mockPrisma.listing.update).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: { status: "FULFILLED" },
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-2",
        type: "CLAIM_FULFILLED",
      }),
    });
  });
});

describe("/api/claims/[id]/messages", () => {
  beforeEach(() => {
    resetTestMocks();
  });

  it("allows the claim owner to post a message", async () => {
    const claim = {
      id: "claim-1",
      userId: "user-2",
      listing: { id: "listing-1", userId: "user-1", title: "Winter Coat" },
      _count: { messages: 1 },
    };
    const message = {
      id: "msg-1",
      claimId: "claim-1",
      userId: "user-2",
      content: "I can arrive after 5pm.",
      user: { id: "user-2", name: "Claimant" },
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-2", name: "Claimant" }));
    mockPrisma.claim.findUnique.mockResolvedValueOnce(claim).mockResolvedValueOnce(claim);
    mockPrisma.claimMessage.create.mockResolvedValue(message);

    const response = await POSTClaimMessage(
      createJsonRequest("http://localhost/api/claims/claim-1/messages", "POST", {
        content: "  I can arrive after 5pm.  ",
      }),
      createRouteContext("claim-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(201);
    expect(json).toEqual({
      success: true,
      data: message,
      message: "Message sent.",
    });
    expect(mockPrisma.claimMessage.create).toHaveBeenCalledWith({
      data: {
        claimId: "claim-1",
        userId: "user-2",
        content: "I can arrive after 5pm.",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "CLAIM_MESSAGE",
        title: "New claim message",
        message: "Claimant sent a new message about Winter Coat.",
        link: "/listings/listing-1",
      },
    });
  });

  it("rejects new messages after the fifth message", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.claim.findUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-2",
      listing: { id: "listing-1", userId: "user-1", title: "Winter Coat" },
      _count: { messages: 5 },
    });

    const response = await POSTClaimMessage(
      createJsonRequest("http://localhost/api/claims/claim-1/messages", "POST", {
        content: "One more update",
      }),
      createRouteContext("claim-1"),
    );

    expect(response.status).toBe(400);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "This claim already has the maximum number of messages.",
    });
  });

  it("returns claim messages to the listing owner", async () => {
    const messages = [
      {
        id: "msg-1",
        claimId: "claim-1",
        userId: "user-2",
        content: "Can pick up Friday",
        user: { id: "user-2", name: "Claimant" },
      },
    ];

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.claim.findUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-2",
      listing: { userId: "user-1" },
    });
    mockPrisma.claimMessage.findMany.mockResolvedValue(messages);

    const response = await GETClaimMessages(
      createGetRequest("http://localhost/api/claims/claim-1/messages"),
      createRouteContext("claim-1"),
    );

    expect(response.status).toBe(200);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: true,
      data: messages,
    });
  });
});

describe("/api/claims/[id]/gratitude", () => {
  beforeEach(() => {
    resetTestMocks();
  });

  it("allows fulfilled claim recipients to share gratitude notes", async () => {
    const gratitudeNote = {
      id: "note-1",
      claimId: "claim-1",
      userId: "user-2",
      content: "Thank you for your kindness!",
      user: { id: "user-2", name: "Claimant" },
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.claim.findUnique.mockResolvedValue({
      id: "claim-1",
      userId: "user-2",
      status: "FULFILLED",
      gratitudeNote: null,
    });
    mockPrisma.gratitudeNote.create.mockResolvedValue(gratitudeNote);

    const response = await POSTGratitude(
      createJsonRequest("http://localhost/api/claims/claim-1/gratitude", "POST", {
        content: "  Thank you for your kindness!  ",
      }),
      createRouteContext("claim-1"),
    );

    expect(response.status).toBe(201);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: true,
      data: gratitudeNote,
      message: "Gratitude note shared.",
    });
    expect(mockPrisma.gratitudeNote.create).toHaveBeenCalledWith({
      data: {
        claimId: "claim-1",
        userId: "user-2",
        content: "Thank you for your kindness!",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  it("returns gratitude notes publicly", async () => {
    const gratitudeNote = {
      id: "note-1",
      claimId: "claim-1",
      userId: "user-2",
      content: "Thank you for your kindness!",
      user: { id: "user-2", name: "Claimant" },
    };

    mockPrisma.gratitudeNote.findUnique.mockResolvedValue(gratitudeNote);

    const response = await GETGratitude(
      createGetRequest("http://localhost/api/claims/claim-1/gratitude"),
      createRouteContext("claim-1"),
    );

    expect(response.status).toBe(200);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: true,
      data: gratitudeNote,
    });
  });
});
