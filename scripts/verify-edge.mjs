const baseUrl = process.env.APP_BASE_URL ?? `http://localhost:${process.env.APP_PORT ?? "3000"}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const health = await fetch(`${baseUrl}/api/health`);
assert(health.ok, `Health endpoint returned ${health.status}.`);

const ready = await fetch(`${baseUrl}/api/ready`);
assert(ready.ok, `Readiness endpoint returned ${ready.status}.`);

let limitedResponse;
for (let requestNumber = 0; requestNumber < 12; requestNumber += 1) {
  const response = await fetch(`${baseUrl}/api/v1/calculations/percentage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": `untrusted-${requestNumber}`,
    },
    body: JSON.stringify({ percentage: "10", value: "100" }),
  });
  if (response.status === 429) {
    limitedResponse = response;
    break;
  }
}

assert(limitedResponse, "Nginx did not rate limit the request burst.");
assert(limitedResponse.headers.get("retry-after"), "Rate limit response omitted Retry-After.");
assert(limitedResponse.headers.get("x-request-id"), "Rate limit response omitted X-Request-Id.");
const payload = await limitedResponse.json();
assert(payload?.error?.code === "RATE_LIMITED", "Rate limit response used an unexpected body.");

console.log("Edge proxy health, readiness, and rate-limit contract verified.");
