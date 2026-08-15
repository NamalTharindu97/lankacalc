import { describe, expect, it } from "vitest";

import {
  brickBlockCalculator,
  concreteCalculator,
  paintCalculator,
  roofMaterialCalculator,
  steelCalculator,
  tileQuantityCalculator,
} from "@/domain/calculators/construction-calculators";
import { getCalculators } from "@/domain/calculators/registry";
import { executeCalculationRequest } from "@/server/api/calculations";

describe("tile quantity calculator", () => {
  it("estimates tiles for a rectangular floor without joints", () => {
    const calculation = tileQuantityCalculator.calculate({
      length: 4,
      width: 3,
      unit: "metre",
      tileLength: 600,
      tileWidth: 600,
      jointMillimetres: 0,
      wastagePercent: 5,
    });

    expect(calculation.result).toMatchObject({
      floorArea: "12.000",
      effectiveTileLength: "0.6",
      effectiveTileWidth: "0.6",
      tilesBeforeWastage: 34,
      tilesAfterWastage: 36,
    });
  });

  it("accounts for joint width and unit conversion", () => {
    const calculation = tileQuantityCalculator.calculate({
      length: 10,
      width: 10,
      unit: "foot",
      tileLength: 300,
      tileWidth: 300,
      jointMillimetres: 5,
      wastagePercent: 0,
    });

    expect(calculation.result.floorArea).toBe("9.290");
    expect(calculation.result.tilesAfterWastage).toBeGreaterThan(0);
  });

  it("rejects a zero-length room", () => {
    expect(() =>
      tileQuantityCalculator.calculate({
        length: 0,
        width: 3,
        unit: "metre",
        tileLength: 600,
        tileWidth: 600,
        jointMillimetres: 3,
        wastagePercent: 5,
      }),
    ).toThrow();
  });
});

describe("paint calculator", () => {
  it("estimates litres including coats and wastage", () => {
    const calculation = paintCalculator.calculate({
      surfaceArea: 40,
      unit: "square-metre",
      coats: 2,
      coveragePerLitre: 10,
      wastagePercent: 10,
    });

    expect(calculation.result).toMatchObject({
      surfaceAreaSquareMetres: "40",
      areaToCover: "80",
      exactLitres: "8.0",
      litresToBuy: 9,
      wastageLitres: "1.0",
    });
  });

  it("converts square feet to square metres", () => {
    const calculation = paintCalculator.calculate({
      surfaceArea: 10,
      unit: "square-foot",
      coats: 1,
      coveragePerLitre: 10,
      wastagePercent: 0,
    });

    expect(calculation.result.surfaceAreaSquareMetres).toBe("0.93");
    expect(calculation.result.litresToBuy).toBe(1);
  });

  it("rejects zero coats", () => {
    expect(() =>
      paintCalculator.calculate({
        surfaceArea: 40,
        unit: "square-metre",
        coats: 0,
        coveragePerLitre: 10,
        wastagePercent: 10,
      }),
    ).toThrow();
  });
});

describe("concrete calculator", () => {
  it("estimates cubic metres of concrete", () => {
    const calculation = concreteCalculator.calculate({
      length: 5,
      width: 4,
      depth: 0.15,
      unit: "metre",
      wastagePercent: 5,
    });

    expect(calculation.result).toMatchObject({
      volume: "3",
      wastageVolume: "0.15",
      totalVolume: "3.15",
    });
  });

  it("calculates from centimetres", () => {
    const calculation = concreteCalculator.calculate({
      length: 200,
      width: 100,
      depth: 12,
      unit: "centimetre",
      wastagePercent: 0,
    });

    expect(calculation.result.totalVolume).toBe("0.24");
  });

  it("rejects a non-positive depth", () => {
    expect(() =>
      concreteCalculator.calculate({
        length: 5,
        width: 4,
        depth: 0,
        unit: "metre",
        wastagePercent: 5,
      }),
    ).toThrow();
  });
});

describe("brick and block calculator", () => {
  it("estimates bricks for a standard Sri Lankan wall", () => {
    const calculation = brickBlockCalculator.calculate({
      length: 5,
      height: 3,
      unit: "metre",
      openingArea: 0,
      brickLength: 222,
      brickHeight: 72,
      jointMillimetres: 10,
      wastagePercent: 5,
    });

    expect(calculation.result).toMatchObject({
      wallArea: "15",
      bricksPerSquareMetre: "52.57",
      bricksBeforeWastage: 789,
      bricksAfterWastage: 829,
    });
  });

  it("deducts openings from the wall area", () => {
    const calculation = brickBlockCalculator.calculate({
      length: 5,
      height: 3,
      unit: "metre",
      openingArea: 2,
      brickLength: 222,
      brickHeight: 72,
      jointMillimetres: 10,
      wastagePercent: 0,
    });

    expect(calculation.result.wallArea).toBe("13");
    expect(calculation.result.bricksBeforeWastage).toBe(684);
  });
});

describe("steel calculator", () => {
  it("estimates rebar weight from the d2/162 formula", () => {
    const calculation = steelCalculator.calculate({
      diameterMillimetres: "12",
      barLengthMetres: 12,
      bars: 100,
      wastagePercent: 0,
    });

    expect(calculation.result).toMatchObject({
      totalLength: "1200",
      unitWeightKilogrammesPerMetre: "0.889",
      weightKilogrammes: "1066.67",
      wastageKilogrammes: "0.00",
      totalKilogrammes: "1066.67",
    });
  });

  it("applies wastage to a lighter bar", () => {
    const calculation = steelCalculator.calculate({
      diameterMillimetres: "8",
      barLengthMetres: 12,
      bars: 50,
      wastagePercent: 5,
    });

    expect(calculation.result.unitWeightKilogrammesPerMetre).toBe("0.395");
    expect(calculation.result.totalKilogrammes).toBe("248.89");
  });

  it("rejects an unknown bar diameter", () => {
    expect(() =>
      steelCalculator.calculate({
        diameterMillimetres: "5",
        barLengthMetres: 12,
        bars: 10,
        wastagePercent: 0,
      }),
    ).toThrow();
  });
});

describe("roof material calculator", () => {
  it("estimates clay tiles on a flat roof", () => {
    const calculation = roofMaterialCalculator.calculate({
      length: 10,
      width: 6,
      unit: "metre",
      slopeDegrees: 0,
      material: "clay-tile",
      coveragePerUnit: 0.111,
      wastagePercent: 5,
    });

    expect(calculation.result).toMatchObject({
      footprintArea: "60",
      roofArea: "60.00",
      unitsBeforeWastage: 541,
      unitsAfterWastage: 569,
      unitLabel: "tiles",
    });
  });

  it("expands roof area with slope for metal sheets", () => {
    const calculation = roofMaterialCalculator.calculate({
      length: 10,
      width: 6,
      unit: "metre",
      slopeDegrees: 45,
      material: "corrugated-metal-sheet",
      coveragePerUnit: 1.44,
      wastagePercent: 0,
    });

    expect(calculation.result.roofArea).toBe("84.85");
    expect(calculation.result.unitsBeforeWastage).toBe(59);
    expect(calculation.result.unitsAfterWastage).toBe(59);
    expect(calculation.result.unitLabel).toBe("sheets");
  });

  it("applies the material preset when coverage is omitted", () => {
    const calculation = roofMaterialCalculator.calculate({
      length: 10,
      width: 6,
      unit: "metre",
      slopeDegrees: 0,
      material: "concrete-tile",
      wastagePercent: 0,
    });

    expect(calculation.normalizedInputs.coveragePerUnit).toBe("0.1");
    expect(calculation.result.unitsBeforeWastage).toBe(600);
  });

  it("rejects an excessive slope", () => {
    expect(() =>
      roofMaterialCalculator.calculate({
        length: 10,
        width: 6,
        unit: "metre",
        slopeDegrees: 61,
        material: "clay-tile",
        coveragePerUnit: 0.111,
        wastagePercent: 5,
      }),
    ).toThrow();
  });
});

describe("construction calculator fixtures", () => {
  it.each([
    ["tile-quantity", tileQuantityCalculator, { length: "4", width: "3", unit: "metre", tileLength: "600", tileWidth: "600", jointMillimetres: "0", wastagePercent: "0" }, { floorArea: "12.000", tilesBeforeWastage: 34, tilesAfterWastage: 34 }],
    ["tile-quantity", tileQuantityCalculator, { length: "4", width: "3", unit: "metre", tileLength: "600", tileWidth: "600", jointMillimetres: "0", wastagePercent: "5" }, { floorArea: "12.000", tilesBeforeWastage: 34, tilesAfterWastage: 36 }],
    ["tile-quantity", tileQuantityCalculator, { length: "10", width: "6", unit: "foot", tileLength: "300", tileWidth: "300", jointMillimetres: "0", wastagePercent: "0" }, { floorArea: "5.574", tilesBeforeWastage: 62 }],
    ["paint", paintCalculator, { surfaceArea: "40", unit: "square-metre", coats: "2", coveragePerLitre: "10", wastagePercent: "10" }, { surfaceAreaSquareMetres: "40", areaToCover: "80", exactLitres: "8.0", litresToBuy: 9, wastageLitres: "1.0" }],
    ["paint", paintCalculator, { surfaceArea: "100", unit: "square-metre", coats: "1", coveragePerLitre: "10", wastagePercent: "0" }, { surfaceAreaSquareMetres: "100", areaToCover: "100", exactLitres: "10.0", litresToBuy: 10, wastageLitres: "0.0" }],
    ["concrete", concreteCalculator, { length: "5", width: "4", depth: "0.15", unit: "metre", wastagePercent: "5" }, { volume: "3", wastageVolume: "0.15", totalVolume: "3.15" }],
    ["concrete", concreteCalculator, { length: "200", width: "100", depth: "12", unit: "centimetre", wastagePercent: "0" }, { volume: "0.24", wastageVolume: "0", totalVolume: "0.24" }],
    ["brick-block", brickBlockCalculator, { length: "5", height: "3", unit: "metre", openingArea: "0", brickLength: "222", brickHeight: "72", jointMillimetres: "10", wastagePercent: "5" }, { wallArea: "15", bricksPerSquareMetre: "52.57", bricksBeforeWastage: 789, bricksAfterWastage: 829 }],
    ["brick-block", brickBlockCalculator, { length: "5", height: "3", unit: "metre", openingArea: "2", brickLength: "222", brickHeight: "72", jointMillimetres: "10", wastagePercent: "0" }, { wallArea: "13", bricksBeforeWastage: 684, bricksAfterWastage: 684 }],
    ["steel", steelCalculator, { diameterMillimetres: "12", barLengthMetres: "12", bars: "100", wastagePercent: "0" }, { totalLength: "1200", unitWeightKilogrammesPerMetre: "0.889", weightKilogrammes: "1066.67", wastageKilogrammes: "0.00", totalKilogrammes: "1066.67" }],
    ["steel", steelCalculator, { diameterMillimetres: "8", barLengthMetres: "12", bars: "50", wastagePercent: "5" }, { totalLength: "600", unitWeightKilogrammesPerMetre: "0.395", weightKilogrammes: "237.04", wastageKilogrammes: "11.85", totalKilogrammes: "248.89" }],
    ["roof-material", roofMaterialCalculator, { length: "10", width: "6", unit: "metre", slopeDegrees: "0", material: "clay-tile", coveragePerUnit: "0.111", wastagePercent: "5" }, { footprintArea: "60", roofArea: "60.00", unitsBeforeWastage: 541, unitsAfterWastage: 569, unitLabel: "tiles" }],
    ["roof-material", roofMaterialCalculator, { length: "10", width: "6", unit: "metre", slopeDegrees: "45", material: "corrugated-metal-sheet", coveragePerUnit: "1.44", wastagePercent: "0" }, { roofArea: "84.85", unitsBeforeWastage: 59, unitsAfterWastage: 59, unitLabel: "sheets" }],
  ])("matches the approved fixture through the domain and API for %s", async (key, calculator, input, expected) => {
    const direct = calculator.calculate(input);
    const api = await executeCalculationRequest(key, input);

    expect(direct.result).toMatchObject(expected);
    expect(api).toEqual({ status: 200, body: direct });
  });

  it("publishes the construction calculators in the registry", () => {
    const keys = getCalculators().map((calculator) => calculator.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        "tile-quantity",
        "paint",
        "concrete",
        "brick-block",
        "steel",
        "roof-material",
      ]),
    );
  });
});
