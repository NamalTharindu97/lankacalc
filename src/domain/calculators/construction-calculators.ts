import Decimal from "decimal.js";
import { z } from "zod";

import { decimal, rounded } from "@/domain/calculators/decimal";
import { decimalInput, integerInput } from "@/domain/calculators/input";
import {
  defineCalculator,
  type CalculatorMetadata,
  type CalculationResult,
} from "@/domain/calculators/types";
import {
  lengthInMetres,
  lengthUnitOptions,
  lengthUnits,
} from "@/domain/calculators/units";

const PI = "3.141592653589793238462643383279502884197";
const squareFootToSquareMetre = "0.09290304";

const areaUnitOptions = [
  { label: "Square metres", value: "square-metre" },
  { label: "Square feet", value: "square-foot" },
];

const areaUnits = ["square-metre", "square-foot"] as const;

function areaInSquareMetres(value: string, unit: (typeof areaUnits)[number]): Decimal {
  return unit === "square-foot"
    ? decimal(value).mul(squareFootToSquareMetre)
    : decimal(value);
}

function wholeCount(value: Decimal): number {
  const ceiling = value.ceil();
  if (ceiling.greaterThan(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Material count exceeds the supported range.");
  }
  return ceiling.toNumber();
}

function constructionResult(
  calculator: Pick<CalculatorMetadata, "key" | "version">,
  values: Omit<CalculationResult, "calculator" | "calculationVersion" | "ruleVersions" | "sources" | "verifiedAt">,
): CalculationResult {
  return {
    calculator: calculator.key,
    calculationVersion: calculator.version,
    ruleVersions: [],
    sources: [],
    verifiedAt: null,
    ...values,
  };
}

const dimension = decimalInput({
  min: "0.001",
  max: 1_000_000,
  maxDecimalPlaces: 6,
});

const wastagePercent = decimalInput({ min: 0, max: 50, maxDecimalPlaces: 1 });

const tileQuantityMetadata = {
  key: "tile-quantity",
  name: "Tile quantity calculator",
  shortName: "Tile quantity",
  summary: "Estimate how many floor or wall tiles a room needs, including joints and wastage.",
  category: "Build",
  classification: "static",
  version: "1.0.0",
  accent: "blue",
  fields: [
    { name: "length", label: "Room length", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "width", label: "Room width", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "unit", label: "Dimension unit", type: "select", required: true, defaultValue: "metre", options: lengthUnitOptions },
    { name: "tileLength", label: "Tile length", type: "number", required: true, min: 1, max: 2000, maxDecimalPlaces: 0, step: 1, suffix: "mm" },
    { name: "tileWidth", label: "Tile width", type: "number", required: true, min: 1, max: 2000, maxDecimalPlaces: 0, step: 1, suffix: "mm" },
    { name: "jointMillimetres", label: "Joint width", type: "number", required: true, min: 0, max: 20, maxDecimalPlaces: 1, step: 0.5, suffix: "mm", defaultValue: 3 },
    { name: "wastagePercent", label: "Wastage", type: "number", required: true, min: 0, max: 50, maxDecimalPlaces: 1, step: 0.5, suffix: "%", defaultValue: 5 },
  ],
} as const satisfies CalculatorMetadata;

const tileQuantitySchema = z.object({
  length: dimension,
  width: dimension,
  unit: z.enum(lengthUnits),
  tileLength: integerInput({ min: 1, max: 2000 }),
  tileWidth: integerInput({ min: 1, max: 2000 }),
  jointMillimetres: decimalInput({ min: 0, max: 20, maxDecimalPlaces: 1 }),
  wastagePercent,
});

export const tileQuantityCalculator = defineCalculator({
  ...tileQuantityMetadata,
  schema: tileQuantitySchema,
  run(input) {
    const floorArea = lengthInMetres(input.length, input.unit).mul(
      lengthInMetres(input.width, input.unit),
    );
    const joint = decimal(input.jointMillimetres).div(1000);
    const effectiveLength = decimal(input.tileLength).div(1000).plus(joint);
    const effectiveWidth = decimal(input.tileWidth).div(1000).plus(joint);
    const effectiveArea = effectiveLength.mul(effectiveWidth);
    const beforeWastage = wholeCount(floorArea.div(effectiveArea));
    const afterWastage = wholeCount(
      decimal(beforeWastage).mul(decimal(1).plus(decimal(input.wastagePercent).div(100))),
    );

    return constructionResult(tileQuantityMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        floorArea: rounded(floorArea, 3, 3),
        effectiveTileLength: rounded(effectiveLength, 3),
        effectiveTileWidth: rounded(effectiveWidth, 3),
      },
      result: {
        floorArea: rounded(floorArea, 3, 3),
        effectiveTileLength: rounded(effectiveLength, 3),
        effectiveTileWidth: rounded(effectiveWidth, 3),
        tilesBeforeWastage: beforeWastage,
        tilesAfterWastage: afterWastage,
      },
      breakdown: [
        { label: "Floor area", value: rounded(floorArea, 3, 3), unit: "m2" },
        { label: "Effective tile area", value: rounded(effectiveArea, 4), unit: "m2" },
        { label: "Tiles before wastage", value: beforeWastage, unit: "tiles" },
        { label: "Wastage allowance", value: `${input.wastagePercent}%` },
        { label: "Tiles to order", value: afterWastage, unit: "tiles" },
      ],
      assumptions: [
        "Tiles are laid edge to edge with a uniform joint on all four sides of each tile.",
        "The count assumes a flush rectangular area; borders, diagonal layouts, and patterns need more tiles.",
        "Wastage is applied by rounding the final count up to a whole number of tiles.",
      ],
      warnings: [
        "This is an estimate, not a structural, engineering, or procurement specification.",
        "Order extra for cuts; openings, thresholds, and fixture cut-outs are not deducted.",
      ],
    });
  },
});

const paintMetadata = {
  key: "paint",
  name: "Paint quantity calculator",
  shortName: "Paint",
  summary: "Estimate litres of paint for a surface area, coats, coverage, and wastage.",
  category: "Build",
  classification: "static",
  version: "1.0.0",
  accent: "orange",
  fields: [
    { name: "surfaceArea", label: "Surface area", type: "number", required: true, min: 0.01, max: 1_000_000, maxDecimalPlaces: 2, step: 0.01 },
    { name: "unit", label: "Area unit", type: "select", required: true, defaultValue: "square-metre", options: areaUnitOptions },
    { name: "coats", label: "Coats", type: "number", required: true, min: 1, max: 4, maxDecimalPlaces: 0, step: 1, defaultValue: 2 },
    { name: "coveragePerLitre", label: "Coverage", type: "number", required: true, min: 1, max: 50, maxDecimalPlaces: 1, step: 0.1, suffix: "m2/L", defaultValue: 10, description: "How much surface one litre covers. Around 10 m2/L for emulsion on smooth masonry." },
    { name: "wastagePercent", label: "Wastage", type: "number", required: true, min: 0, max: 50, maxDecimalPlaces: 1, step: 0.5, suffix: "%", defaultValue: 10 },
  ],
} as const satisfies CalculatorMetadata;

const paintSchema = z.object({
  surfaceArea: decimalInput({ min: "0.01", max: 1_000_000, maxDecimalPlaces: 2 }),
  unit: z.enum(areaUnits),
  coats: integerInput({ min: 1, max: 4 }),
  coveragePerLitre: decimalInput({ min: 1, max: 50, maxDecimalPlaces: 1 }),
  wastagePercent,
});

export const paintCalculator = defineCalculator({
  ...paintMetadata,
  schema: paintSchema,
  run(input) {
    const surfaceArea = areaInSquareMetres(input.surfaceArea, input.unit);
    const areaToCover = surfaceArea.mul(input.coats);
    const rawLitres = areaToCover.div(input.coveragePerLitre);
    const wastageAdjusted = rawLitres.mul(decimal(1).plus(decimal(input.wastagePercent).div(100)));
    const litresToBuy = wholeCount(wastageAdjusted);
    const wastageLitres = decimal(litresToBuy).minus(rawLitres);

    return constructionResult(paintMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        surfaceAreaSquareMetres: rounded(surfaceArea, 2),
      },
      result: {
        surfaceAreaSquareMetres: rounded(surfaceArea, 2),
        areaToCover: rounded(areaToCover, 2),
        exactLitres: rounded(rawLitres, 1, 1),
        litresToBuy,
        wastageLitres: rounded(wastageLitres, 1, 1),
      },
      breakdown: [
        { label: "Surface area", value: rounded(surfaceArea, 2), unit: "m2" },
        { label: "Coats", value: input.coats, unit: "coats" },
        { label: "Area to cover", value: rounded(areaToCover, 2), unit: "m2" },
        { label: "Paint needed", value: rounded(rawLitres, 1, 1), unit: "litres" },
        { label: "Wastage allowance", value: `${input.wastagePercent}%` },
        { label: "Litres to buy", value: litresToBuy, unit: "litres" },
      ],
      assumptions: [
        "Coverage is a flat-rate estimate; the default of 10 m2/L suits emulsion on smooth, primed masonry.",
        "Each coat covers the full surface, so the area to cover is the surface multiplied by the number of coats.",
        "Wastage covers cutting in, roller loss, and touch-ups and is absorbed by rounding up to a whole litre.",
      ],
      warnings: [
        "This is an estimate, not a professional paint specification.",
        "Porous or rough surfaces, primer, undercoat, woodwork, and ceilings are not included.",
      ],
    });
  },
});

const concreteMetadata = {
  key: "concrete",
  name: "Concrete quantity calculator",
  shortName: "Concrete",
  summary: "Estimate cubic metres of concrete for a slab or footing, including wastage.",
  category: "Build",
  classification: "static",
  version: "1.0.0",
  accent: "ink",
  fields: [
    { name: "length", label: "Length", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "width", label: "Width", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "depth", label: "Depth or thickness", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "unit", label: "Dimension unit", type: "select", required: true, defaultValue: "metre", options: lengthUnitOptions },
    { name: "wastagePercent", label: "Wastage", type: "number", required: true, min: 0, max: 50, maxDecimalPlaces: 1, step: 0.5, suffix: "%", defaultValue: 5 },
  ],
} as const satisfies CalculatorMetadata;

const concreteSchema = z.object({
  length: dimension,
  width: dimension,
  depth: dimension,
  unit: z.enum(lengthUnits),
  wastagePercent,
});

export const concreteCalculator = defineCalculator({
  ...concreteMetadata,
  schema: concreteSchema,
  run(input) {
    const volume = lengthInMetres(input.length, input.unit)
      .mul(lengthInMetres(input.width, input.unit))
      .mul(lengthInMetres(input.depth, input.unit));
    const wastageVolume = volume.mul(input.wastagePercent).div(100);
    const totalVolume = volume.plus(wastageVolume);

    return constructionResult(concreteMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        volume: rounded(volume, 4),
      },
      result: {
        volume: rounded(volume, 4),
        wastageVolume: rounded(wastageVolume, 4),
        totalVolume: rounded(totalVolume, 4),
      },
      breakdown: [
        { label: "Concrete volume", value: rounded(volume, 4), unit: "m3" },
        { label: "Wastage allowance", value: rounded(wastageVolume, 4), unit: "m3" },
        { label: "Total to order", value: rounded(totalVolume, 4), unit: "m3" },
      ],
      assumptions: [
        "Dimensions are measured from the formwork or excavation faces as entered.",
        "Wastage covers spillage, formwork tolerance, and compaction losses; 5% is a common default.",
        "The result is fresh concrete volume; it does not estimate cement, sand, or aggregate quantities.",
      ],
      warnings: [
        "This is not a structural, mix-design, or engineering calculation.",
        "Reinforcement, formwork, curing, joints, and hauling are not included.",
      ],
    });
  },
});

const brickBlockMetadata = {
  key: "brick-block",
  name: "Brick and block quantity calculator",
  shortName: "Brick and block",
  summary: "Estimate bricks for a single-layer wall, with openings, joints, and wastage.",
  category: "Build",
  classification: "static",
  version: "1.0.0",
  accent: "green",
  fields: [
    { name: "length", label: "Wall length", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "height", label: "Wall height", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "unit", label: "Dimension unit", type: "select", required: true, defaultValue: "metre", options: lengthUnitOptions },
    { name: "openingArea", label: "Openings (doors, windows)", type: "number", required: true, min: 0, max: 1_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "m2", defaultValue: 0, description: "Total area of openings to deduct from the wall." },
    { name: "brickLength", label: "Brick length", type: "number", required: true, min: 50, max: 1000, maxDecimalPlaces: 0, step: 1, suffix: "mm", defaultValue: 222 },
    { name: "brickHeight", label: "Brick height", type: "number", required: true, min: 20, max: 500, maxDecimalPlaces: 0, step: 1, suffix: "mm", defaultValue: 72 },
    { name: "jointMillimetres", label: "Mortar joint", type: "number", required: true, min: 0, max: 30, maxDecimalPlaces: 1, step: 0.5, suffix: "mm", defaultValue: 10 },
    { name: "wastagePercent", label: "Wastage", type: "number", required: true, min: 0, max: 50, maxDecimalPlaces: 1, step: 0.5, suffix: "%", defaultValue: 5 },
  ],
} as const satisfies CalculatorMetadata;

const brickBlockSchema = z.object({
  length: dimension,
  height: dimension,
  unit: z.enum(lengthUnits),
  openingArea: decimalInput({ min: 0, max: 1_000_000, maxDecimalPlaces: 2 }),
  brickLength: integerInput({ min: 50, max: 1000 }),
  brickHeight: integerInput({ min: 20, max: 500 }),
  jointMillimetres: decimalInput({ min: 0, max: 30, maxDecimalPlaces: 1 }),
  wastagePercent,
});

export const brickBlockCalculator = defineCalculator({
  ...brickBlockMetadata,
  schema: brickBlockSchema,
  run(input) {
    const wallArea = lengthInMetres(input.length, input.unit)
      .mul(lengthInMetres(input.height, input.unit))
      .minus(input.openingArea);
    const joint = decimal(input.jointMillimetres).div(1000);
    const effectiveLength = decimal(input.brickLength).div(1000).plus(joint);
    const effectiveHeight = decimal(input.brickHeight).div(1000).plus(joint);
    const effectiveArea = effectiveLength.mul(effectiveHeight);
    const bricksPerSquareMetre = decimal(1).div(effectiveArea);
    const beforeWastage = wholeCount(wallArea.mul(bricksPerSquareMetre));
    const afterWastage = wholeCount(
      decimal(beforeWastage).mul(decimal(1).plus(decimal(input.wastagePercent).div(100))),
    );

    return constructionResult(brickBlockMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        wallArea: rounded(wallArea, 3),
        bricksPerSquareMetre: rounded(bricksPerSquareMetre, 2),
      },
      result: {
        wallArea: rounded(wallArea, 3),
        bricksPerSquareMetre: rounded(bricksPerSquareMetre, 2),
        bricksBeforeWastage: beforeWastage,
        bricksAfterWastage: afterWastage,
      },
      breakdown: [
        { label: "Wall area", value: rounded(wallArea, 3), unit: "m2" },
        { label: "Bricks per square metre", value: rounded(bricksPerSquareMetre, 2), unit: "bricks" },
        { label: "Bricks before wastage", value: beforeWastage, unit: "bricks" },
        { label: "Wastage allowance", value: `${input.wastagePercent}%` },
        { label: "Bricks to order", value: afterWastage, unit: "bricks" },
      ],
      assumptions: [
        "A single-layer (half-brick) wall is assumed; each unit contributes its length and height plus one mortar joint on each dimension.",
        "The default 222 by 72 mm brick with a 10 mm joint is a common Sri Lankan brick; all brick and joint values are user-adjustable.",
        "Openings are fully deducted, including their area only, not the surrounding reveals.",
      ],
      warnings: [
        "This is an estimate, not a structural, masonry-design, or engineering calculation.",
        "Mortar volume, hollow-block and multi-leaf walls, lintels, tie beams, and columns are not included.",
      ],
    });
  },
});

const steelDiameterOptions = [
  { label: "6 mm", value: "6" },
  { label: "8 mm", value: "8" },
  { label: "10 mm", value: "10" },
  { label: "12 mm", value: "12" },
  { label: "16 mm", value: "16" },
  { label: "20 mm", value: "20" },
  { label: "25 mm", value: "25" },
  { label: "32 mm", value: "32" },
];

const steelDiameters = ["6", "8", "10", "12", "16", "20", "25", "32"] as const;

const steelMetadata = {
  key: "steel",
  name: "Steel quantity calculator",
  shortName: "Steel",
  summary: "Estimate the weight of TMT rebar from bar diameter, length, and count.",
  category: "Build",
  classification: "static",
  version: "1.0.0",
  accent: "gold",
  fields: [
    { name: "diameterMillimetres", label: "Bar diameter", type: "select", required: true, defaultValue: "12", options: steelDiameterOptions },
    { name: "barLengthMetres", label: "Bar length", type: "number", required: true, min: 0.1, max: 24, maxDecimalPlaces: 2, step: 0.1, suffix: "m", defaultValue: 12, description: "Standard TMT bars are supplied in 12 m lengths." },
    { name: "bars", label: "Number of bars", type: "number", required: true, min: 1, max: 10000, maxDecimalPlaces: 0, step: 1 },
    { name: "wastagePercent", label: "Wastage", type: "number", required: true, min: 0, max: 50, maxDecimalPlaces: 1, step: 0.5, suffix: "%", defaultValue: 5 },
  ],
} as const satisfies CalculatorMetadata;

const steelSchema = z.object({
  diameterMillimetres: z.enum(steelDiameters).transform(Number),
  barLengthMetres: decimalInput({ min: "0.1", max: 24, maxDecimalPlaces: 2 }),
  bars: integerInput({ min: 1, max: 10000 }),
  wastagePercent,
});

export const steelCalculator = defineCalculator({
  ...steelMetadata,
  schema: steelSchema,
  run(input) {
    const totalLength = decimal(input.barLengthMetres).mul(input.bars);
    const unitWeight = decimal(input.diameterMillimetres).pow(2).div(162);
    const weight = totalLength.mul(unitWeight);
    const wastage = weight.mul(input.wastagePercent).div(100);
    const total = weight.plus(wastage);

    return constructionResult(steelMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        totalLength: rounded(totalLength, 2),
        unitWeightKilogrammesPerMetre: rounded(unitWeight, 3),
      },
      result: {
        totalLength: rounded(totalLength, 2),
        unitWeightKilogrammesPerMetre: rounded(unitWeight, 3),
        weightKilogrammes: rounded(weight, 2, 2),
        wastageKilogrammes: rounded(wastage, 2, 2),
        totalKilogrammes: rounded(total, 2, 2),
      },
      breakdown: [
        { label: "Total bar length", value: rounded(totalLength, 2), unit: "m" },
        { label: "Unit weight", value: rounded(unitWeight, 3), unit: "kg/m" },
        { label: "Steel weight", value: rounded(weight, 2, 2), unit: "kg" },
        { label: "Wastage allowance", value: rounded(wastage, 2, 2), unit: "kg" },
        { label: "Total weight", value: rounded(total, 2, 2), unit: "kg" },
      ],
      assumptions: [
        "Unit weight uses the standard d2/162 kg/m formula for reinforcement steel (7850 kg/m3).",
        "Bars are plain straight lengths; laps, couplers, hooks, anchorage, and binding wire are excluded.",
        "Bar grade does not change the mass estimate.",
      ],
      warnings: [
        "This is a quantity and weight estimate, not a structural design, schedule, or engineering calculation.",
        "Confirm grades, lengths, and weights with your supplier before ordering.",
      ],
    });
  },
});

const roofMaterialOptions = [
  { label: "Clay tiles", value: "clay-tile" },
  { label: "Concrete tiles", value: "concrete-tile" },
  { label: "Corrugated metal sheets", value: "corrugated-metal-sheet" },
];

const roofMaterials = ["clay-tile", "concrete-tile", "corrugated-metal-sheet"] as const;

const roofCoverageDefaults: Record<(typeof roofMaterials)[number], string> = {
  "clay-tile": "0.111",
  "concrete-tile": "0.1",
  "corrugated-metal-sheet": "1.44",
};

const roofMaterialLabel: Record<(typeof roofMaterials)[number], string> = {
  "clay-tile": "tiles",
  "concrete-tile": "tiles",
  "corrugated-metal-sheet": "sheets",
};

const roofMaterialMetadata = {
  key: "roof-material",
  name: "Roof material quantity calculator",
  shortName: "Roof material",
  summary: "Estimate tiles or metal sheets for a pitched roof over a rectangular building.",
  category: "Build",
  classification: "static",
  version: "1.0.0",
  accent: "rose",
  fields: [
    { name: "length", label: "Building length", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "width", label: "Building width", type: "number", required: true, min: 0.001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.001 },
    { name: "unit", label: "Dimension unit", type: "select", required: true, defaultValue: "metre", options: lengthUnitOptions },
    { name: "slopeDegrees", label: "Roof slope", type: "number", required: true, min: 0, max: 60, maxDecimalPlaces: 1, step: 0.5, suffix: "deg", defaultValue: 15 },
    { name: "material", label: "Material", type: "select", required: true, defaultValue: "clay-tile", options: roofMaterialOptions },
    { name: "coveragePerUnit", label: "Coverage per unit", type: "number", required: true, min: 0.01, max: 5, maxDecimalPlaces: 4, step: 0.001, suffix: "m2", description: "Effective covered area of one sheet or tile after overlaps. Presets: clay ~0.111, concrete ~0.1, metal sheet ~1.44 m2." },
    { name: "wastagePercent", label: "Wastage", type: "number", required: true, min: 0, max: 50, maxDecimalPlaces: 1, step: 0.5, suffix: "%", defaultValue: 5 },
  ],
} as const satisfies CalculatorMetadata;

const roofMaterialSchema = z.object({
  length: dimension,
  width: dimension,
  unit: z.enum(lengthUnits),
  slopeDegrees: decimalInput({ min: 0, max: 60, maxDecimalPlaces: 1 }),
  material: z.enum(roofMaterials),
  coveragePerUnit: decimalInput({ min: "0.01", max: 5, maxDecimalPlaces: 4 }).optional(),
  wastagePercent,
});

export const roofMaterialCalculator = defineCalculator({
  ...roofMaterialMetadata,
  schema: roofMaterialSchema,
  run(input) {
    const coveragePerUnit = input.coveragePerUnit ?? roofCoverageDefaults[input.material];
    const footprintArea = lengthInMetres(input.length, input.unit).mul(
      lengthInMetres(input.width, input.unit),
    );
    const radians = decimal(input.slopeDegrees).mul(PI).div(180);
    const roofArea = footprintArea.div(Math.cos(radians.toNumber()));
    const rawUnits = roofArea.div(coveragePerUnit);
    const beforeWastage = wholeCount(rawUnits);
    const afterWastage = wholeCount(
      decimal(beforeWastage).mul(decimal(1).plus(decimal(input.wastagePercent).div(100))),
    );

    return constructionResult(roofMaterialMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        coveragePerUnit,
        footprintArea: rounded(footprintArea, 2),
        roofArea: rounded(roofArea, 2, 2),
      },
      result: {
        footprintArea: rounded(footprintArea, 2),
        roofArea: rounded(roofArea, 2, 2),
        unitsBeforeWastage: beforeWastage,
        unitsAfterWastage: afterWastage,
        unitLabel: roofMaterialLabel[input.material],
      },
      breakdown: [
        { label: "Building footprint", value: rounded(footprintArea, 2), unit: "m2" },
        { label: "Roof surface area", value: rounded(roofArea, 2, 2), unit: "m2" },
        { label: "Units before wastage", value: beforeWastage, unit: roofMaterialLabel[input.material] },
        { label: "Wastage allowance", value: `${input.wastagePercent}%` },
        { label: "Units to order", value: afterWastage, unit: roofMaterialLabel[input.material] },
      ],
      assumptions: [
        "A single-plane roof over a rectangular footprint is assumed; the surface expands by 1 / cos(slope).",
        "Coverage per unit is effective covered area after overlaps, not physical size; presets are user-adjustable suggestions.",
        "Wastage covers cut waste and installation losses and is applied by rounding up.",
      ],
      warnings: [
        "This is an estimate, not an engineering calculation.",
        "Ridge caps, valleys, flashings, fascias, guttering, and eaves details are not included.",
      ],
    });
  },
});
