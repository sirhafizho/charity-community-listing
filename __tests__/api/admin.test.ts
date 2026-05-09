import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ApiTestResponse, createJsonRequest, createRouteContext, parseJson } from "../helpers/api";
import { createSession, mockAuth, mockPrisma, resetTestMocks } from "../helpers/mocks";

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

let GET: typeof import("@/app/api/admin/listings/route").GET;
let PUT: typeof import("@/app/api/admin/listings/[id]/route").PUT;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/admin/listings/route"));
  ({ PUT } = await import("@/app/api/admin/listings/[id]/route"));
});

describe("/api/admin/listings", () => {
  beforeEach(() => {
    resetTestMocks();
  });

  it("requires authentication to list admin listings", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("rejects non-admin users from listing admin listings", async () => {
    mockAuth.mockResolvedValue(createSession());

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Admin access required.",
    });
  });

  it("returns all listings for admins", async () => {
    const listings = [
      {
        id: "listing-1",
        title: "Winter Coat",
        status: "PENDING",
        category: { id: "cat-1", name: "Clothing" },
        user: { id: "user-1", name: "Owner", email: "owner@example.com" },
        _count: { claims: 2 },
      },
    ];

    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.listing.findMany.mockResolvedValue(listings);

    const response = await GET();
    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, data: listings });
    expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            claims: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  });

  it("rejects non-admin users from moderating listings", async () => {
    mockAuth.mockResolvedValue(createSession());

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/listings/listing-1", "PUT", {
        status: "APPROVED",
      }),
      createRouteContext("listing-1"),
    );

    expect(response.status).toBe(403);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Admin access required.",
    });
  });

  it("approves listings for admins", async () => {
    const updatedListing = {
      id: "listing-1",
      status: "APPROVED",
      category: { id: "cat-1", name: "Clothing" },
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
    };

    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1" });
    mockPrisma.listing.update.mockResolvedValue(updatedListing);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/listings/listing-1", "PUT", {
        status: "APPROVED",
      }),
      createRouteContext("listing-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: updatedListing,
      message: "Listing approved successfully.",
    });
    expect(mockPrisma.listing.update).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: { status: "APPROVED" },
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
    });
  });

  it("rejects listings for admins", async () => {
    const updatedListing = {
      id: "listing-2",
      status: "REJECTED",
      category: { id: "cat-1", name: "Clothing" },
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
    };

    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-2" });
    mockPrisma.listing.update.mockResolvedValue(updatedListing);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/listings/listing-2", "PUT", {
        status: "REJECTED",
      }),
      createRouteContext("listing-2"),
    );

    expect(response.status).toBe(200);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: true,
      data: updatedListing,
      message: "Listing rejected successfully.",
    });
  });

  it("returns 404 when moderating a missing listing", async () => {
    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.listing.findUnique.mockResolvedValue(null);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/listings/missing", "PUT", {
        status: "APPROVED",
      }),
      createRouteContext("missing"),
    );

    expect(response.status).toBe(404);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Listing not found.",
    });
  });
});
