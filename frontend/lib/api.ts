import type { ImageDto, ListImagesResponse, PresignedUpload } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

if (!API_URL && typeof window !== "undefined") {
  console.error("NEXT_PUBLIC_API_URL is not set.");
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {}
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function createUpload(
  filename: string,
  contentType: string
): Promise<PresignedUpload> {
  return request<PresignedUpload>("/uploads", {
    method: "POST",
    body: JSON.stringify({ filename, contentType }),
  });
}

export function listImages(
  limit = 24,
  cursor?: string
): Promise<ListImagesResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request<ListImagesResponse>(`/images?${params}`);
}

export function getImage(imageId: string): Promise<ImageDto> {
  return request<ImageDto>(`/images/${encodeURIComponent(imageId)}`);
}

export function deleteImage(imageId: string): Promise<void> {
  return request<void>(`/images/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
  });
}
