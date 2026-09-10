import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ImageDto, ImageRecord } from "./types";
import { s3 } from "./client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME } from "./env";

export const THUMBNAIL_URL_TTL_SECONDS = 300;

export async function presignThumbnailUrl(
  record: ImageRecord
): Promise<string | undefined> {
  if (record.status !== "READY" || !record.thumbnailKey) return undefined;

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: record.thumbnailKey }),
    { expiresIn: THUMBNAIL_URL_TTL_SECONDS }
  );
}

export function toDto(record: ImageRecord, thumbnailUrl?: string): ImageDto {
  const { gsi1pk: _gsi1pk, expiresAt: _expiresAt, ...rest } = record;
  return { ...rest, thumbnailUrl };
}
