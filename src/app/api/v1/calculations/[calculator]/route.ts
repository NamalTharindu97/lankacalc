import { NextResponse } from "next/server";

import { executeCalculationRequest } from "@/server/api/calculations";
import {
  calculationRateLimiter,
  clientAddress,
} from "@/server/rate-limit";

type RouteContext = {
  params: Promise<{ calculator: string }>;
};

class PayloadTooLargeError extends Error {}

async function readRequestBody(request: Request, maximumBytes: number): Promise<string> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return body + decoder.decode();
    }

    bytesRead += value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const rateLimit = calculationRateLimiter.take(clientAddress(request));
  const requestId = crypto.randomUUID();
  const responseHeaders = {
    "X-Request-Id": requestId,
  };
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many calculation requests." } },
      {
        status: 429,
        headers: {
          ...responseHeaders,
          "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
        },
      },
    );
  }

  let payload: unknown;

  try {
    const requestBody = await readRequestBody(request, 16_384);
    payload = JSON.parse(requestBody);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." } },
        { status: 413, headers: responseHeaders },
      );
    }
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "The request body must contain valid JSON." } },
      { status: 400, headers: responseHeaders },
    );
  }

  const { calculator: calculatorKey } = await context.params;
  try {
    const response = await executeCalculationRequest(calculatorKey, payload);
    return NextResponse.json(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error(JSON.stringify({
      event: "calculation_failed",
      requestId,
      calculator: calculatorKey,
      error: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "The calculation could not be completed." } },
      { status: 500, headers: responseHeaders },
    );
  }
}
