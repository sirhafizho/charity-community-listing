import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ApiTestResponse, createJsonRequest, parseJson } from "../helpers/api";
import { createSession, mockAuth, mockPrisma, resetTestMocks } from "../helpers/mocks";

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

let GET: typeof import("@/app/api/categories/route").GET;
let POST: typeof import("@/app/api/categories/route").POST;

beforeAll(async () => {
  ({ GET, POST } = await import("@/app/api/categories/route"));
});

describe("/api/categories", () => {
  beforeEach(() => {
    resetTestMocks();
  });

  it("returns the category list", async () => {
    const categories = [
      { id: "cat-1", name: "Books", description: null, icon: null },
      { id: "cat-2", name: "Clothing", description: "Coats and jackets", icon: "shirt" },
    ];

    mockPrisma.category.findMany.mockResolvedValue(categories);

    const response = await GET();
    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, data: categories });
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    });
  });

  it("requires authentication to create a category", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      createJsonRequest("http://localhost/api/categories", "POST", {
        name: "Food",
      }),
    );

    expect(response.status).toBe(401);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("rejects non-admin users when creating a category", async () => {
    mockAuth.mockResolvedValue(createSession());

    const response = await POST(
      createJsonRequest("http://localhost/api/categories", "POST", {
        name: "Food",
      }),
    );

    expect(response.status).toBe(403);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Admin access required.",
    });
  });

  it("rejects duplicate category names", async () => {
    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1", name: "Food" });

    const response = await POST(
      createJsonRequest("http://localhost/api/categories", "POST", {
        name: "Food",
      }),
    );

    expect(response.status).toBe(409);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "A category with this name already exists.",
    });
    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("creates a category for admin users", async () => {
    const category = {
      id: "cat-3",
      name: "Food",
      description: null,
      icon: null,
    };

    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.category.findUnique.mockResolvedValue(null);
    mockPrisma.category.create.mockResolvedValue(category);

    const response = await POST(
      createJsonRequest("http://localhost/api/categories", "POST", {
        name: "  Food  ",
        description: "   ",
        icon: "   ",
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(201);
    expect(json).toEqual({
      success: true,
      data: category,
      message: "Category created successfully.",
    });
    expect(mockPrisma.category.create).toHaveBeenCalledWith({
      data: {
        name: "Food",
        description: null,
        icon: null,
      },
    });
  });
});
