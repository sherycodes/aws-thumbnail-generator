import type { S3Event, S3EventRecord } from "aws-lambda";
import {
  decodeEventKey,
  idFromKey,
  thumbKey,
  UPLOAD_PREFIX,
} from "../shared/keys";
import { ddb, s3 } from "../shared/client";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, TABLE_NAME } from "../shared/env";
import sharp from "sharp";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

const THUMB_MAX_EDGE = 400;
const WEBP_QUALITY = 82;

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: S3EventRecord): Promise<void> {
  const key = decodeEventKey(record.s3.object.key);

  if (!key.startsWith(UPLOAD_PREFIX)) {
    console.warn("Ignoring object outside the uploads prefix", { key });
    return;
  }

  const imageId = idFromKey(key);
  if (!imageId) {
    console.warn("Could not parse an imageId from key", { key });
    return;
  }

  const startedAt = Date.now();

  try {
    const original = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    if (!original.Body) throw new Error(`S3 object ${key} had an empty body.`);

    const input = Buffer.from(await original.Body.transformToByteArray());

    const pipeline = sharp(input)
      .rotate()
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      });

    const { data: thumbnail, info } = await pipeline.toBuffer({
      resolveWithObject: true,
    });

    const destinationKey = thumbKey(imageId);

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: destinationKey,
        Body: thumbnail,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { imageId },
        UpdateExpression:
          "SET #status = :status, thumbnailKey = :key, width = :w, height = :h, sizeBytes = :size REMOVE #error",
        ExpressionAttributeNames: { "#status": "status", "#error": "error" },
        ExpressionAttributeValues: {
          ":status": "READY",
          ":key": destinationKey,
          ":w": info.width,
          ":h": info.height,
          ":size": record.s3.object.size,
        },
        ConditionExpression: "attribute_exists(imageId)",
      })
    );

    console.log("Thumbnail generated", {
      imageId,
      sourceBytes: record.s3.object.size,
      thumbBytes: thumbnail.length,
      dimensions: `${info.width}x${info.height}`,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Thumbnail generation failed", {
      imageId,
      key,
      error: message,
    });
    await markFailed(imageId, message);
  }
}

async function markFailed(imageId: string, message: string): Promise<void> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { imageId },
        UpdateExpression: "SET #status = :status, #error = :error",
        ExpressionAttributeNames: { "#status": "status", "#error": "error" },
        ExpressionAttributeValues: {
          ":status": "FAILED",
          ":error": message.slice(0, 500),
        },
        ConditionExpression: "attribute_exists(imageId)",
      })
    );
  } catch (err) {
    console.error("Could not record FAILED status", { imageId, err });
  }
}
