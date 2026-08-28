import { describe, expect, it } from "vitest";

import { getCalculatorContent, getCalculatorContentKeys } from "@/domain/calculators/content";
import { getCalculator } from "@/domain/calculators/registry";
import { locales } from "@/i18n/config";

describe("calculator editorial content", () => {
  it("references registered browser calculators and complete locales", () => {
    for (const key of getCalculatorContentKeys()) {
      expect(getCalculator(key)?.execution).toBe("browser");
      for (const locale of locales) {
        const content = getCalculatorContent(key, locale);
        expect(content?.directAnswer.length).toBeGreaterThan(80);
        expect(content?.faqs.length).toBeGreaterThanOrEqual(2);
        expect(Number.isNaN(Date.parse(content?.reviewedAt ?? ""))).toBe(false);
      }
    }
  });

  it("uses valid related calculator keys", () => {
    for (const key of getCalculatorContentKeys()) {
      for (const locale of locales) {
        const content = getCalculatorContent(key, locale);
        for (const relatedKey of content?.relatedCalculatorKeys ?? []) {
          expect(relatedKey).not.toBe(key);
          expect(getCalculator(relatedKey)?.execution).toBe("browser");
        }
      }
    }
  });

  it("keeps every localized worked example aligned with its executable calculator", () => {
    for (const key of getCalculatorContentKeys()) {
      const calculator = getCalculator(key);
      expect(calculator?.execution).toBe("browser");
      if (!calculator || calculator.execution !== "browser") continue;

      for (const locale of locales) {
        const fixture = getCalculatorContent(key, locale)?.workedExample.fixture;
        expect(fixture).toBeDefined();
        const result = calculator.calculate(fixture?.input);
        expect(result.result).toMatchObject(fixture?.expectedResult ?? {});
      }
    }
  });
});
