import { NextRequest } from "next/server";

export type ApiTestResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: unknown;
  details?: {
    fieldErrors?: Record<string, unknown>;
    formErrors?: string[];
  };
};

export function createJsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function createGetRequest(url: string) {
  return new NextRequest(url);
}

export function createFormDataRequest(url: string, formData: FormData, method = "POST") {
  return new NextRequest(url, {
    method,
    body: formData,
  });
}

export function createRouteContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

export async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
