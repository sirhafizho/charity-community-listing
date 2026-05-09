import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ApiSuccessResponse, PaginationMeta } from "@/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function apiSuccess<T>(
  data: T,
  options: {
    status?: number;
    message?: string;
    meta?: PaginationMeta;
  } = {},
) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(options.message ? { message: options.message } : {}),
    ...(options.meta ? { meta: options.meta } : {}),
  };

  return NextResponse.json(payload, { status: options.status ?? 200 });
}

export function apiError(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export function handleApiError(error: unknown, fallbackMessage = "Internal server error") {
  if (error instanceof ZodError) {
    return apiError("Validation failed", 422, error.flatten());
  }

  if (error instanceof SyntaxError) {
    return apiError("Invalid request payload.", 400);
  }

  if (isObject(error) && "message" in error && typeof error.message === "string") {
    return apiError(error.message || fallbackMessage, 500);
  }

  return apiError(fallbackMessage, 500);
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsedValue = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

export function getPaginationParams(
  searchParams: URLSearchParams,
  options: {
    defaultLimit?: number;
    maxLimit?: number;
  } = {},
) {
  const defaultLimit = options.defaultLimit ?? 12;
  const maxLimit = options.maxLimit ?? 50;
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const requestedLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}
