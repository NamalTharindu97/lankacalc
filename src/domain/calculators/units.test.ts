import { describe, expect, it } from "vitest";

import {
  distanceInKilometres,
  kilometresInUnit,
  lengthInMetres,
  litresInUnit,
  metresInUnit,
  squareMetresInUnit,
  volumeInLitres,
} from "@/domain/calculators/units";

describe("unit normalization", () => {
  it("uses exact length conversions", () => {
    expect(lengthInMetres("1", "foot").toString()).toBe("0.3048");
    expect(lengthInMetres("1", "centimetre").toString()).toBe("0.01");
    expect(squareMetresInUnit("0.09290304", "foot").toString()).toBe("1");
  });

  it("uses exact distance and volume conversions", () => {
    expect(distanceInKilometres("1", "mile").toString()).toBe("1.609344");
    expect(volumeInLitres("1", "us-gallon").toString()).toBe("3.785411784");
    expect(volumeInLitres("1", "imperial-gallon").toString()).toBe("4.54609");
  });

  it.each(["metre", "centimetre", "foot"] as const)("round trips %s lengths", (unit) => {
    const metres = lengthInMetres("123.456", unit);
    expect(metresInUnit(metres.toString(), unit).toString()).toBe("123.456");
  });

  it.each(["kilometre", "mile"] as const)("round trips %s distances", (unit) => {
    const kilometres = distanceInKilometres("123.456", unit);
    expect(kilometresInUnit(kilometres.toString(), unit).toString()).toBe("123.456");
  });

  it.each(["litre", "us-gallon", "imperial-gallon"] as const)(
    "round trips %s volumes",
    (unit) => {
      const litres = volumeInLitres("12.345", unit);
      expect(litresInUnit(litres.toString(), unit).toString()).toBe("12.345");
    },
  );

  it.each(["metre", "centimetre", "foot"] as const)("round trips %s square units", (unit) => {
    const squareMetres = lengthInMetres("12.345", unit).pow(2);
    expect(squareMetresInUnit(squareMetres.toString(), unit).toString()).toBe(
      "152.399025",
    );
  });
});
