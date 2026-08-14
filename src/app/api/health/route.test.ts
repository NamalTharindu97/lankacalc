import { describe, expect, it } from "vitest";

import { GET as health } from "@/app/api/health/route";
import { readinessResponse } from "@/app/api/ready/route";

describe("operational health routes", () => {
  it("reports process liveness without database access", async () => {
    const response = health();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("reports database readiness", async () => {
    const response = await readinessResponse(async () => undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ready" });
  });

  it("reports database unavailability without exposing the error", async () => {
    const response = await readinessResponse(async () => {
      throw new Error("database details");
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
  });
});
