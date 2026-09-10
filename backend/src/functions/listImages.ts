import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { ddb } from "../shared/client";
import { GSI_NAME, TABLE_NAME } from "../shared/env";
import { badRequest, ok, withErrorHandling } from "../shared/http";
import { presignThumbnailUrl, toDto } from "../shared/presign";
import type { ImageRecord } from "../shared/types";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent) => {
    const limitParam = event.queryStringParameters?.limit;
    const limit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
    if (!Number.isFinite(limit) || limit < 1 || limit > MAX_LIMIT) {
      return badRequest(
        `limit must be a number between 1 and ${MAX_LIMIT}.`,
        event
      );
    }

    const cursor = decodeCursor(event.queryStringParameters?.cursor);
    if (cursor === "INVALID") return badRequest("cursor is malformed.", event);

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI_NAME,
        KeyConditionExpression: "gsi1pk = :pk",
        ExpressionAttributeValues: { ":pk": "IMAGE" },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: cursor,
      })
    );

    const records = (result.Items ?? []) as ImageRecord[];
    const items = await Promise.all(
      records.map(async (record) =>
        toDto(record, await presignThumbnailUrl(record))
      )
    );

    return ok(
      {
        items,
        nextCursor: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
              "base64url"
            )
          : null,
      },
      event
    );
  }
);

function decodeCursor(
  raw: string | undefined
): Record<string, unknown> | undefined | "INVALID" {
  if (!raw) return undefined;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return "INVALID";
  }
}
