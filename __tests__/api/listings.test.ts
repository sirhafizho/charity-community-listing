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

let getListings: typeof import("@/app/api/listings/route").GET;
let createListing: typeof import("@/app/api/listings/route").POST;
let deleteListing: typeof import("@/app/api/listings/[id]/route").DELETE;
let getListingById: typeof import("@/app/api/listings/[id]/route").GET;
let updateListing: typeof import("@/app/api/listings/[id]/route").PUT;

beforeAll(async () => {
  ({ GET: getListings, POST: createListing } = await import("@/app/api/listings/route"));
  ({ DELETE: deleteListing, GET: getListingById, PUT: updateListing } = await import("@/app/api/listings/[id]/route"));
});

describe("/api/listings", () => {
  beforeEach(() => {
    resetTestMocks();
  });

  it("returns approved listings with filters and pagination metadata", async () => {
    const listings = [
      {
        id: "listing-1",
        title: "Winter Coat",
        description: "A warm winter coat in great condition.",
        location: "Boston",
        status: "APPROVED",
        categoryId: "cat-1",
        userId: "user-1",
        category: { id: "cat-1", name: "Clothing" },
        user: { id: "user-1", name: "Owner", email: "owner@example.com" },
      },
    ];

    mockPrisma.listing.findMany.mockResolvedValue(listings);
    mockPrisma.listing.count.mockResolvedValue(3);

    const response = await getListings(
      createGetRequest(
        "http://localhost/api/listings?page=2&limit=1&category=cat-1&search=coat",
      ),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: listings,
      meta: {
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
      },
    });
    expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
      where: {
        status: "APPROVED",
        categoryId: "cat-1",
        OR: [
          { title: { contains: "coat" } },
          { description: { contains: "coat" } },
          { location: { contains: "coat" } },
          { category: { name: { contains: "coat" } } },
        ],
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      skip: 1,
      take: 1,
    });
    expect(mockPrisma.listing.count).toHaveBeenCalledWith({
      where: {
        status: "APPROVED",
        categoryId: "cat-1",
        OR: [
          { title: { contains: "coat" } },
          { description: { contains: "coat" } },
          { location: { contains: "coat" } },
          { category: { name: { contains: "coat" } } },
        ],
      },
    });
  });

  it("requires authentication to create a listing", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await createListing(
      createJsonRequest("http://localhost/api/listings", "POST", {
        title: "Winter Coat",
        description: "A warm winter coat in great condition.",
        categoryId: "cat-1",
        location: "Boston",
        image: "/uploads/coat.png",
      }),
    );

    expect(response.status).toBe(401);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("creates pending listings for authenticated users", async () => {
    const createdListing = {
      id: "listing-1",
      title: "Winter Coat",
      description: "A warm winter coat in great condition.",
      location: "Boston",
      image: "/uploads/coat.png",
      status: "PENDING",
      categoryId: "cat-1",
      userId: "user-1",
      category: { id: "cat-1", name: "Clothing" },
      tags: [
        { id: "tag-1", name: "winter" },
        { id: "tag-2", name: "kids" },
      ],
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1", name: "Clothing" });
    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "winter" });
    mockPrisma.listing.create.mockResolvedValue(createdListing);

    const response = await createListing(
      createJsonRequest("http://localhost/api/listings", "POST", {
        title: "  Winter Coat  ",
        description: "  A warm winter coat in great condition.  ",
        categoryId: "cat-1",
        location: "  Boston  ",
        image: "/uploads/coat.png",
        tags: [" Winter ", "Kids"],
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(201);
    expect(json).toEqual({
      success: true,
      data: createdListing,
      message: "Listing submitted and awaiting approval.",
    });
    expect(mockPrisma.listing.create).toHaveBeenCalledWith({
      data: {
        title: "Winter Coat",
        description: "A warm winter coat in great condition.",
        location: "Boston",
        condition: "GOOD",
        image: "/uploads/coat.png",
        categoryId: "cat-1",
        userId: "user-1",
        status: "PENDING",
        urgency: "NORMAL",
        expiresAt: null,
        tags: {
          connect: [
            { name: "winter" },
            { name: "kids" },
          ],
        },
      },
      include: {
        category: true,
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
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

  it("returns 404 when creating a listing with an unknown category", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.category.findUnique.mockResolvedValue(null);

    const response = await createListing(
      createJsonRequest("http://localhost/api/listings", "POST", {
        title: "Winter Coat",
        description: "A warm winter coat in great condition.",
        categoryId: "missing-category",
        location: "Boston",
      }),
    );

    expect(response.status).toBe(404);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Category not found.",
    });
  });

  it("returns approved listings publicly without claim details", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: "listing-1",
      title: "Winter Coat",
      description: "A warm winter coat in great condition.",
      location: "Boston",
      status: "APPROVED",
      userId: "user-1",
      category: { id: "cat-1", name: "Clothing" },
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
      _count: { claims: 0 },
    });

    const response = await getListingById(
      createGetRequest("http://localhost/api/listings/listing-1"),
      createRouteContext("listing-1"),
    );

    const json = await parseJson<ApiTestResponse<{ id: string; claims?: unknown }>>(response);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data?.id).toBe("listing-1");
    expect(json.data?.claims).toBeUndefined();
    expect(mockPrisma.claim.findMany).not.toHaveBeenCalled();
  });

  it("includes claim details when the listing owner requests a pending listing", async () => {
    const claims = [
      {
        id: "claim-1",
        status: "PENDING",
        user: { id: "user-2", name: "Claimant", email: "claimant@example.com" },
      },
    ];

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: "listing-1",
      title: "Winter Coat",
      description: "A warm winter coat in great condition.",
      location: "Boston",
      status: "PENDING",
      userId: "user-1",
      category: { id: "cat-1", name: "Clothing" },
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
      _count: { claims: 1 },
    });
    mockPrisma.claim.findMany.mockResolvedValue(claims);

    const response = await getListingById(
      createGetRequest("http://localhost/api/listings/listing-1"),
      createRouteContext("listing-1"),
    );

    const json = await parseJson<ApiTestResponse<{ claims?: unknown }>>(response);

    expect(response.status).toBe(200);
    expect(json.data?.claims).toEqual(claims);
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
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("only allows owners to update listings", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", userId: "user-1" });

    const response = await updateListing(
      createJsonRequest("http://localhost/api/listings/listing-1", "PUT", {
        title: "Updated coat",
      }),
      createRouteContext("listing-1"),
    );

    expect(response.status).toBe(403);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Only the listing owner can update this listing.",
    });
  });

  it("updates listings and resets them to pending review", async () => {
    const updatedListing = {
      id: "listing-1",
      title: "Updated coat",
      status: "PENDING",
      category: { id: "cat-2", name: "Essentials" },
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-1" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", userId: "user-1" });
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-2", name: "Essentials" });
    mockPrisma.listing.update.mockResolvedValue(updatedListing);

    const response = await updateListing(
      createJsonRequest("http://localhost/api/listings/listing-1", "PUT", {
        title: "  Updated coat  ",
        categoryId: "cat-2",
        image: "/uploads/updated.png",
      }),
      createRouteContext("listing-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: updatedListing,
      message: "Listing updated and sent back for review.",
    });
    expect(mockPrisma.listing.update).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: {
        status: "PENDING",
        title: "Updated coat",
        category: { connect: { id: "cat-2" } },
        image: "/uploads/updated.png",
      },
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

  it("allows admins to delete listings", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "admin-1", role: "ADMIN" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", userId: "user-1" });
    mockPrisma.listing.delete.mockResolvedValue({ id: "listing-1" });

    const response = await deleteListing(
      createGetRequest("http://localhost/api/listings/listing-1"),
      createRouteContext("listing-1"),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: { id: "listing-1" },
      message: "Listing deleted successfully.",
    });
    expect(mockPrisma.listing.delete).toHaveBeenCalledWith({ where: { id: "listing-1" } });
  });
});
