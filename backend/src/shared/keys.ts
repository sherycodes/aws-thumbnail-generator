export const UPLOAD_PREFIX = "uploads/";
export const THUMBNAIL_PREFIX = "thumbnails/";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function extensionFor(contentType: string): string {
  return EXT_BY_CONTENT_TYPE[contentType] ?? ".bin";
}

export function uploadKey(imageId: string, contentType: string): string {
  return `${UPLOAD_PREFIX}${imageId}${extensionFor(contentType)}`;
}

export function thumbKey(imageId: string): string {
  return `${THUMBNAIL_PREFIX}${imageId}.webp`;
}

export function idFromKey(key: string): string | null {
  if (!key.startsWith(UPLOAD_PREFIX)) return null;
  const filename = key.slice(UPLOAD_PREFIX.length);
  const id = filename.replace(/\.[^.]+$/, "");
  return id.length > 0 ? id : null;
}

export function decodeEventKey(rawKey: string): string {
  return decodeURIComponent(rawKey.replace(/\+/g, " "));
}
