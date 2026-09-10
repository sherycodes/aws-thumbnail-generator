import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { ddb, s3 } from "../shared/client";
import { BUCKET_NAME, RETENTION_DAYS, TABLE_NAME } from "../shared/env";
import {
  badRequest,
  created,
  parseJsonBody,
  withErrorHandling,
} from "../shared/http";
import { uploadKey } from "../shared/keys";
import {
  ALLOWED_CONTENT_TYPES,
  CreateUploadBody,
  ImageRecord,
  MAX_UPLOAD_BYTES,
  MIN_UPLOAD_BYTES,
} from "../shared/types";
import { sanitiseFilename } from "../shared/utils";

const URL_TTL_SECONDS = 300;

export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent) => {
    const body = parseJsonBody<CreateUploadBody>(event);
    if (!body) return badRequest("Request body must be valid JSON.", event);

    const contentType = body.contentType?.toLowerCase().trim();
    if (!contentType) return badRequest("contentType is required.", event);

    if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)) {
      return badRequest(
        `Unsupported contentType "${contentType}". ` +
          `Allowed: ${ALLOWED_CONTENT_TYPES.join(", ")}.`,
        event
      );
    }

    const imageId = randomUUID();
    const key = uploadKey(imageId, contentType);
    const now = new Date();

    const presigned = await createPresignedPost(s3, {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: URL_TTL_SECONDS,
      Conditions: [
        ["content-length-range", MIN_UPLOAD_BYTES, MAX_UPLOAD_BYTES],
        ["eq", "$Content-Type", contentType],
      ],
      Fields: {
        "Content-Type": contentType,
      },
    });

    const record: ImageRecord = {
      imageId,
      contentType,
      originalKey: key,
      filename: sanitiseFilename(body.filename) ?? imageId,
      status: "PENDING",
      uploadedAt: now.toISOString(),
      gsi1pk: "IMAGE",
      expiresAt: Math.floor(now.getTime() / 1000) + RETENTION_DAYS * 86_400,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: record }));

    return created(
      {
        imageId,
        url: presigned.url,
        fields: presigned.fields,
        expiresIn: URL_TTL_SECONDS,
      },
      event
    );
  }
);
