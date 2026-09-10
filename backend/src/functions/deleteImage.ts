import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { ddb, s3 } from "../shared/client";
import { BUCKET_NAME, TABLE_NAME } from "../shared/env";
import { badRequest, noContent, withErrorHandling } from "../shared/http";
import type { ImageRecord } from "../shared/types";

export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent) => {
    const imageId = event.pathParameters?.imageId;
    if (!imageId)
      return badRequest("imageId path parameter is required.", event);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { imageId } })
    );
    const record = existing.Item as ImageRecord | undefined;

    if (!record) return noContent(event);

    const keys = [record.originalKey, record.thumbnailKey]
      .filter((k): k is string => Boolean(k))
      .map((Key) => ({ Key }));

    if (keys.length > 0) {
      const result = await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: { Objects: keys, Quiet: true },
        })
      );

      if (result.Errors?.length) {
        console.error("S3 delete reported per-object errors", {
          imageId,
          errors: result.Errors,
        });
        throw new Error(
          `Failed to delete ${result.Errors.length} S3 object(s).`
        );
      }
    }

    await ddb.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { imageId } })
    );

    console.log("Deleted image", { imageId, objectsRemoved: keys.length });
    return noContent(event);
  }
);
