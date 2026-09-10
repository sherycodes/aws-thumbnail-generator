import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ALLOWED_ORIGINS } from "./env";

function resolveOrigin(event: APIGatewayProxyEvent | undefined): string {
  const requestOrigin =
    event?.headers?.origin ?? event?.headers?.Origin ?? undefined;
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
}

function headersFor(event?: APIGatewayProxyEvent): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": resolveOrigin(event),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(
  statusCode: number,
  body: unknown,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: headersFor(event),
    body: body === undefined ? "" : JSON.stringify(body),
  };
}
export const ok = (body: unknown, event?: APIGatewayProxyEvent) =>
  json(200, body, event);

export const created = (body: unknown, event?: APIGatewayProxyEvent) =>
  json(201, body, event);

export const noContent = (
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult => ({
  statusCode: 204,
  headers: headersFor(event),
  body: "",
});

export const badRequest = (message: string, event?: APIGatewayProxyEvent) =>
  json(400, { error: "BadRequest", message }, event);

export const notFound = (message = "Not found", event?: APIGatewayProxyEvent) =>
  json(404, { error: "NotFound", message }, event);

export const serverError = (
  message = "Internal server error",
  event?: APIGatewayProxyEvent
) => json(500, { error: "InternalServerError", message }, event);

export function withErrorHandling(
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) {
  return async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    try {
      return await handler(event);
    } catch (err) {
      console.error("Unhandled error", {
        path: event?.path,
        method: event?.httpMethod,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return serverError("Something went wrong. Check CloudWatch logs.", event);
    }
  };
}
export function parseJsonBody<T>(event: APIGatewayProxyEvent): T | null {
  if (!event.body) return null;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
