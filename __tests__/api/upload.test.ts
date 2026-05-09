import path from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ApiTestResponse, createFormDataRequest, parseJson } from "../helpers/api";
import { createSession, mockAuth, resetTestMocks } from "../helpers/mocks";

const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
const mockRandomUUID = jest.fn();

jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("node:crypto", () => ({ randomUUID: mockRandomUUID }));
jest.mock("node:fs/promises", () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
}));

let POST: typeof import("@/app/api/upload/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/upload/route"));
});

describe("POST /api/upload", () => {
  beforeEach(() => {
    resetTestMocks();
    mockAuth.mockResolvedValue(createSession());
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockRandomUUID.mockReturnValue("uuid-123");
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("file", new File(["image"], "photo.png", { type: "image/png" }));

    const response = await POST(createFormDataRequest("http://localhost/api/upload", formData));

    expect(response.status).toBe(401);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("requires a file upload", async () => {
    const formData = new FormData();
    formData.set("file", "not-a-file");

    const response = await POST(createFormDataRequest("http://localhost/api/upload", formData));

    expect(response.status).toBe(400);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "An image file is required.",
    });
  });

  it("rejects empty files", async () => {
    const formData = new FormData();
    formData.set("file", new File([""], "empty.png", { type: "image/png" }));

    const response = await POST(createFormDataRequest("http://localhost/api/upload", formData));

    expect(response.status).toBe(400);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "The uploaded file is empty.",
    });
  });

  it("rejects oversized files", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    );

    const response = await POST(createFormDataRequest("http://localhost/api/upload", formData));

    expect(response.status).toBe(413);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Image size must be 5MB or smaller.",
    });
  });

  it("rejects non-image files", async () => {
    const formData = new FormData();
    formData.set("file", new File(["hello"], "notes.txt", { type: "text/plain" }));

    const response = await POST(createFormDataRequest("http://localhost/api/upload", formData));

    expect(response.status).toBe(415);
    expect(await parseJson<ApiTestResponse>(response)).toEqual({
      success: false,
      error: "Only image uploads are allowed.",
    });
  });

  it("uploads a valid image and returns its public URL", async () => {
    const formData = new FormData();
    formData.set("file", new File(["image-data"], "photo", { type: "image/png" }));

    const response = await POST(createFormDataRequest("http://localhost/api/upload", formData));
    const json = await parseJson<ApiTestResponse>(response);

    const expectedPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "1700000000000-uuid-123.png",
    );

    expect(response.status).toBe(201);
    expect(json).toEqual({
      success: true,
      data: {
        url: "/uploads/1700000000000-uuid-123.png",
      },
      message: "Image uploaded successfully.",
    });
    expect(mockMkdir).toHaveBeenCalledWith(path.join(process.cwd(), "public", "uploads"), {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile.mock.calls[0][0]).toBe(expectedPath);
    expect(Buffer.isBuffer(mockWriteFile.mock.calls[0][1])).toBe(true);
  });
});
