import { jest } from "@jest/globals";

export const mockAuth = jest.fn();

export const mockPrisma = {
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  listing: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  claim: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  claimMessage: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  gratitudeNote: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  tag: {
    upsert: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
};

export function resetTestMocks() {
  jest.resetAllMocks();
  mockPrisma.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === "function") {
      return input(mockPrisma);
    }

    return Promise.all(input as Array<Promise<unknown>>);
  });
}

export function createSession(
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
  }> = {},
) {
  return {
    user: {
      id: overrides.id ?? "user-1",
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "user@example.com",
      role: overrides.role ?? "USER",
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}
