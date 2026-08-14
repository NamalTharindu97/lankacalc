import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/v1/calculations/[calculator]/route";

function context(calculator = "percentage") {
  return { params: Promise.resolve({ calculator }) };
}

describe("POST /api/v1/calculations/{calculator}", () => {
  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("https://example.test", {
      method: "POST",
      headers: { "x-real-ip": "192.0.2.10", "x-request-id": "spoofed" },
      body: "{",
    }), context());

    expect(response.status).toBe(400);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
    expect(response.headers.get("X-Request-Id")).not.toBe("spoofed");
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  it("rejects request bodies over 16 KiB", async () => {
    const response = await POST(new Request("https://example.test", {
      method: "POST",
      headers: { "x-real-ip": "192.0.2.11" },
      body: JSON.stringify({ percentage: "1", value: "1", padding: "x".repeat(16_384) }),
    }), context());

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
  });

  it("stops reading a chunked body after 16 KiB", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("x".repeat(10_000)));
        controller.enqueue(encoder.encode("x".repeat(10_000)));
        controller.close();
      },
    });
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "x-real-ip": "192.0.2.13" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const response = await POST(request, context());

    expect(response.status).toBe(413);
  });

  it("rate limits repeated requests from one client", async () => {
    let response: Response | undefined;
    for (let requestNumber = 0; requestNumber < 61; requestNumber += 1) {
      response = await POST(new Request("https://example.test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "192.0.2.12",
        },
        body: JSON.stringify({ percentage: "10", value: "100" }),
      }), context());
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    await expect(response?.json()).resolves.toMatchObject({ error: { code: "RATE_LIMITED" } });
  });
});
