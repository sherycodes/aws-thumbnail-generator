export type ImageStatus = "PENDING" | "READY" | "FAILED";
export interface ImageDto {
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
  thumbnailUrl?: string;
}
export interface ListImagesResponse {
  items: ImageDto[];
  nextCursor: string | null;
}

export interface PresignedUpload {
  imageId: string;
  url: string;
  fields: Record<string, string>;
  expiresIn: number;
}

export interface ImageCardProps {
  image: ImageDto;
  onDelete: (imageId: string) => void;
}

export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MIN_UPLOAD_BYTES = 1024;
