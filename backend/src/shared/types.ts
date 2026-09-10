export type ImageStatus = "PENDING" | "READY" | "FAILED";

export interface ImageRecord {
  imageId: string;
  originalKey: string;
  thumbnailKey?: string;
  status: ImageStatus;
  uploadedAt: string;
  filename: string;
  contentType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  error?: string;
  gsi1pk: "IMAGE";
  expiresAt: number;
}

export interface ImageDto extends Omit<ImageRecord, "gsi1pk" | "expiresAt"> {
  thumbnailUrl?: string;
}

export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MIN_UPLOAD_BYTES = 1024;

export interface CreateUploadBody {
  filename?: string;
  contentType?: string;
}
