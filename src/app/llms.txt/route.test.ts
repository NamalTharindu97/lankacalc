import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/llms.txt/route";
import { getLaunchCalculators } from "@/i18n/catalog";
import { trustPageSlugs } from "@/i18n/trust-content";

describe("llms.txt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("indexes only English launch calculators and trust pages", async () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");
    const response = GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    for (const calculator of getLaunchCalculators("en")) {
      expect(body).toContain(`https://www.example.lk/en/calculators/${calculator.key}`);
    }
    for (const slug of trustPageSlugs) {
      expect(body).toContain(`https://www.example.lk/en/${slug}`);
    }
    expect(body).not.toContain("/api/");
    expect(body).not.toContain("/admin/");
    expect(body).not.toContain("/saved");
    expect(body).not.toContain("/reminders");
  });
});
