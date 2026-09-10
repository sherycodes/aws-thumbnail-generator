function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `It should be set by the environment block in the CDK stack.`
    );
  }
  return value;
}

export const TABLE_NAME = required("TABLE_NAME");
export const BUCKET_NAME = required("BUCKET_NAME");
export const GSI_NAME = "byUploadedAt";
export const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 7);
export const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? "http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
