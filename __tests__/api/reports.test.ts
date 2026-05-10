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

let GETReports: typeof import("@/app/api/reports/route").GET;
let POSTReport: typeof import("@/app/api/reports/route").POST;
let PUTReport: typeof import("@/app/api/reports/[id]/route").PUT;

beforeAll(async () => {
  ({ GET: GETReports, POST: POSTReport } = await import("@/app/api/reports/route"));
  ({ PUT: PUTReport } = await import("@/app/api/reports/[id]/route"));
});

describe("/api/reports", () => {
  beforeEach(() => {
    resetTestMocks();
    mockPrisma.report = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
  });

  it("requires authentication to create a report", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POSTReport(
      createJsonRequest("http://localhost/api/reports", "POST", {
        listingId: "listing-1",
        reason: "SPAM",
      }),
    );

    expect(response.status).toBe(401);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("prevents duplicate reports", async () => {
    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", title: "Winter Coat" });
    mockPrisma.report.findFirst.mockResolvedValue({ id: "report-1" });

    const response = await POSTReport(
      createJsonRequest("http://localhost/api/reports", "POST", {
        listingId: "listing-1",
        reason: "SPAM",
      }),
    );

    expect(response.status).toBe(409);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "You have already reported this listing.",
    });
  });

  it("creates a report for an existing listing", async () => {
    const report = {
      id: "report-1",
      reason: "INAPPROPRIATE",
      details: "Needs moderation",
      user: { id: "user-2", name: "Reporter", email: "reporter@example.com" },
      listing: { id: "listing-1", title: "Winter Coat", status: "APPROVED" },
    };

    mockAuth.mockResolvedValue(createSession({ id: "user-2" }));
    mockPrisma.listing.findUnique.mockResolvedValue({ id: "listing-1", title: "Winter Coat" });
    mockPrisma.report.findFirst.mockResolvedValue(null);
    mockPrisma.report.create.mockResolvedValue(report);

    const response = await POSTReport(
      createJsonRequest("http://localhost/api/reports", "POST", {
        listingId: "listing-1",
        reason: "INAPPROPRIATE",
        details: "  Needs moderation  ",
      }),
    );

    const json = await parseJson<ApiTestResponse>(response);

    expect(response.status).toBe(201);
    expect(json).toEqual({
      success: true,
      data: report,
      message: "Report submitted for Winter Coat.",
    });
    expect(mockPrisma.report.create).toHaveBeenCalledWith({
      data: {
        reason: "INAPPROPRIATE",
        details: "Needs moderation",
        listingId: "listing-1",
        userId: "user-2",
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
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });
  });

  it("requires admin access to list reports", async () => {
    mockAuth.mockResolvedValue(createSession());

    const response = await GETReports(createGetRequest("http://localhost/api/reports"));

    expect(response.status).toBe(403);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "You do not have permission to view reports.",
    });
  });

  it("filters reports by status for admins", async () => {
    const reports = [{ id: "report-1", status: "PENDING" }];

    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.report.findMany.mockResolvedValue(reports);

    const response = await GETReports(createGetRequest("http://localhost/api/reports?status=PENDING"));

    expect(response.status).toBe(200);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: true,
      data: reports,
    });
    expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            condition: true,
            location: true,
            createdAt: true,
            category: {
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
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("/api/reports/[id]", () => {
  beforeEach(() => {
    resetTestMocks();
    mockPrisma.report = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
  });

  it("updates report status for admins", async () => {
    const updatedReport = {
      id: "report-1",
      status: "REVIEWED",
      user: { id: "user-2", name: "Reporter", email: "reporter@example.com" },
      listing: {
        id: "listing-1",
        title: "Winter Coat",
        status: "APPROVED",
        condition: "GOOD",
        location: "Boston",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        category: { id: "cat-1", name: "Clothing" },
        user: { id: "user-1", name: "Owner", email: "owner@example.com" },
      },
    };

    mockAuth.mockResolvedValue(createSession({ role: "ADMIN" }));
    mockPrisma.report.findUnique.mockResolvedValue({
      id: "report-1",
      listing: { id: "listing-1", title: "Winter Coat" },
    });
    mockPrisma.report.update.mockResolvedValue(updatedReport);

    const response = await PUTReport(
      createJsonRequest("http://localhost/api/reports/report-1", "PUT", {
        status: "REVIEWED",
      }),
      createRouteContext("report-1"),
    );

    expect(response.status).toBe(200);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: true,
      data: {
        ...updatedReport,
        listing: {
          ...updatedReport.listing,
          createdAt: updatedReport.listing.createdAt.toISOString(),
        },
      },
      message: "Report for Winter Coat marked as reviewed.",
    });
    expect(mockPrisma.report.update).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: { status: "REVIEWED" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            condition: true,
            location: true,
            createdAt: true,
            category: {
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
        },
      },
    });
  });
});
