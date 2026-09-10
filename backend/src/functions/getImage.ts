import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { ddb } from "../shared/client";
import { TABLE_NAME } from "../shared/env";
import { badRequest, notFound, ok, withErrorHandling } from "../shared/http";
import { presignThumbnailUrl, toDto } from "../shared/presign";
import type { ImageRecord } from "../shared/types";

export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent) => {
    const imageId = event.pathParameters?.imageId;
    if (!imageId)
      return badRequest("imageId path parameter is required.", event);
    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { imageId } })
    );
    const record = result.Item as ImageRecord | undefined;
    if (!record) return notFound(`No image with id ${imageId}.`, event);
    const thumbnailUrl = await presignThumbnailUrl(record);
    return ok(toDto(record, thumbnailUrl), event);
  }
);
