import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ApiTestResponse, createJsonRequest, parseJson } from "../helpers/api";
import { mockPrisma, resetTestMocks } from "../helpers/mocks";

const mockHash = jest.fn();

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("bcryptjs", () => ({ hash: mockHash }));

let POST: typeof import("@/app/api/auth/register/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/auth/register/route"));
});

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    resetTestMocks();
    mockHash.mockResolvedValue("hashed-password");
  });

  it("creates a user for valid input", async () => {
    const createdUser = {
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "USER",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(createdUser);

    const response = await POST(
      createJsonRequest("http://localhost/api/auth/register", "POST", {
        name: "  Jane Doe  ",
        email: "  jane@example.com  ",
        password: "super-secret",
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(201);
    expect(json).toMatchObject({
      success: true,
      message: "Account created successfully.",
      data: {
        id: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
        role: "USER",
      },
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "jane@example.com" },
    });
    expect(mockHash).toHaveBeenCalledWith("super-secret", 12);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "hashed-password",
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("returns validation errors for invalid input", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/auth/register", "POST", {
        name: " J ",
        email: "invalid-email",
        password: "123",
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Validation failed");
    expect(json.details?.fieldErrors?.name).toBeDefined();
    expect(json.details?.fieldErrors?.email).toBeDefined();
    expect(json.details?.fieldErrors?.password).toBeDefined();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects duplicate email addresses", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

    const response = await POST(
      createJsonRequest("http://localhost/api/auth/register", "POST", {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "super-secret",
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(409);
    expect(json).toEqual({
      success: false,
      error: "A user with this email already exists.",
    });
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("requires all registration fields to be present and valid", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/auth/register", "POST", {
        name: "Jane Doe",
        email: "",
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Validation failed");
    expect(json.details?.fieldErrors?.email).toBeDefined();
    expect(json.details?.fieldErrors?.password).toBeDefined();
  });
});
