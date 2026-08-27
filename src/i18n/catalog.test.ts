import { describe, expect, it } from "vitest";

import { getCalculators } from "@/domain/calculators/registry";
import { getLaunchCalculators, getLaunchCategories, translateResultText } from "@/i18n/catalog";
import { locales } from "@/i18n/config";

describe("localized launch catalog", () => {
  it("projects the same browser calculator IDs for every locale", () => {
    const browserKeys = getCalculators().filter(item => item.execution === "browser").map(item => item.key);
    for (const locale of locales) {
      expect(getLaunchCalculators(locale).map(item => item.key)).toEqual(browserKeys);
      expect(getLaunchCalculators(locale).every(item => item.execution === "browser")).toBe(true);
    }
  });

  it("clones presentation metadata without changing canonical definitions", () => {
    const canonical = getCalculators().find(item => item.key === "loan-emi")!;
    const sinhala = getLaunchCalculators("si").find(item => item.key === "loan-emi")!;
    expect(sinhala.name).not.toBe(canonical.name);
    expect(sinhala.fields).not.toBe(canonical.fields);
    expect(canonical.name).toBe("Loan EMI calculator");
    expect(getLaunchCategories("ta").flatMap(item => item.calculators).length).toBe(getLaunchCalculators("ta").length);
  });

  it("never exposes server calculators", () => {
    const serverKeys = new Set(getCalculators().filter(item => item.execution === "server").map(item => item.key));
    expect(getLaunchCalculators("en").some(item => serverKeys.has(item.key))).toBe(false);
  });

  it("projects only serializable metadata into localized calculator pages", () => {
    expect(getLaunchCalculators("si").every(calculator => !("calculate" in calculator))).toBe(true);
  });

  it("uses exact natural translations for result labels and safety notes", () => {
    expect(translateResultText("si", "Regular monthly installment")).toBe("සාමාන්‍ය මාසික වාරිකය");
    expect(translateResultText("ta", "Tiles to order")).toBe("கொள்வனவு செய்ய வேண்டிய ஓடுகள்");
    expect(translateResultText("si", "This is an estimate, not a loan approval, credit decision, or financial advice."))
      .toBe("මෙය ඇස්තමේන්තුවක් පමණි; ණය අනුමැතියක්, ණය තීරණයක් හෝ මූල්‍ය උපදෙසක් නොවේ.");
  });
});
