import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

async function uploadToVercelBlob(file: File): Promise<string> {
  const { put } = await import("@vercel/blob");
  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

async function uploadToLocalFs(file: File): Promise<string> {
  const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDirectory, { recursive: true });

  const originalExtension = path.extname(file.name).toLowerCase();
  const safeExtension =
    originalExtension && /^[.a-z0-9]+$/i.test(originalExtension)
      ? originalExtension
      : extensionByMimeType[file.type] ?? ".bin";
  const fileName = `${Date.now()}-${randomUUID()}${safeExtension}`;
  const filePath = path.join(uploadsDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Authentication required.", 401);
    }

    const { success } = checkRateLimit(
      `upload:${session.user.id}`,
      RATE_LIMITS.upload.limit,
      RATE_LIMITS.upload.windowMs,
    );

    if (!success) {
      return apiError("Too many uploads. Please slow down.", 429);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("An image file is required.", 400);
    }

    if (file.size === 0) {
      return apiError("The uploaded file is empty.", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("Image size must be 5MB or smaller.", 413);
    }

    if (!allowedMimeTypes.has(file.type)) {
      return apiError("Only image uploads are allowed.", 415);
    }

    const url = useVercelBlob
      ? await uploadToVercelBlob(file)
      : await uploadToLocalFs(file);

    return apiSuccess(
      { url },
      {
        status: 201,
        message: "Image uploaded successfully.",
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
