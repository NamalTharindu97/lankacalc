import { z } from "zod";

import {
  ElectricityDecimal,
  decimal,
  money,
  nonnegativeDecimalStringSchema,
  nonnegativeMoneyStringSchema,
} from "@/domain/calculators/energy/schemas";

const blockSchema = z.object({
  minUnits: z.number().int().nonnegative(),
  maxUnits: z.number().int().positive().nullable(),
  energyRatePerKwh: nonnegativeDecimalStringSchema,
  fixedCharge: nonnegativeMoneyStringSchema,
});

const categorySchema = z.object({
  maxUnits: z.number().int().positive().nullable(),
  blocks: z.array(blockSchema).min(1),
});

type BlockCategory = {
  maxUnits: number | null;
  blocks: Array<{
    minUnits: number;
    maxUnits: number | null;
    energyRatePerKwh: string;
    fixedCharge: string;
  }>;
};

function orderedBlockCategories(categories: Array<{
  maxUnits: number | null;
  blocks: Array<{ minUnits: number; maxUnits: number | null }>;
}>): boolean {
  for (let index = 1; index < categories.length; index += 1) {
    const previous = categories[index - 1].maxUnits;
    const current = categories[index].maxUnits;
    if (previous === null || (current !== null && current <= previous)) {
      return false;
    }
  }

  const topIndex = categories.length - 1;
  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const blocks = category.blocks;

    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      if (blockIndex === 0) {
        if (block.minUnits !== 0) {
          return false;
        }
      } else if (block.minUnits !== blocks[blockIndex - 1].maxUnits) {
        return false;
      }

      if (blockIndex === blocks.length - 1) {
        if (index === topIndex) {
          if (block.maxUnits !== null) {
            return false;
          }
        } else if (block.maxUnits !== category.maxUnits) {
          return false;
        }
      }
    }
  }

  return true;
}

const blockPayloadSchema = z
  .object({
    provider: z.literal("ceb"),
    standardBillingDays: z.number().int().positive(),
    sscLPercent: nonnegativeDecimalStringSchema,
    rounding: z.literal("half-up-cent"),
  })
  .strict();

export const electricityDomesticPayloadSchema = blockPayloadSchema
  .extend({
    domesticCategories: z.array(categorySchema).min(1),
  })
  .strict()
  .refine((value) => orderedBlockCategories(value.domesticCategories), {
    message: "Domestic categories must be ascending with the open-ended category last and contiguous blocks.",
  });

export const electricityReligiousPayloadSchema = blockPayloadSchema
  .extend({
    religiousCategories: z.array(categorySchema).min(1),
  })
  .strict()
  .refine((value) => orderedBlockCategories(value.religiousCategories), {
    message: "Religious categories must be ascending with the open-ended category last and contiguous blocks.",
  });

export const electricityDomesticInputSchema = z
  .object({
    unitsConsumed: z.number().int().min(0).max(100_000),
    billingDays: z.number().int().min(15).max(62),
  })
  .strict();

export type ElectricityDomesticPayload = z.infer<typeof electricityDomesticPayloadSchema>;
export type ElectricityReligiousPayload = z.infer<typeof electricityReligiousPayloadSchema>;
export type ElectricityDomesticInput = z.infer<typeof electricityDomesticInputSchema>;

export type DomesticBillBlock = {
  label: string;
  units: string;
  ratePerKwh: string;
  amount: string;
};

export type DomesticBillResult = {
  category: string;
  energyCharge: string;
  fixedCharge: string;
  tariffCharge: string;
  sscLRatePercent: string;
  sscLAmount: string;
  totalPayable: string;
  blocks: DomesticBillBlock[];
};

type BlockBillConfig = {
  standardBillingDays: number;
  categories: BlockCategory[];
  sscLPercent: string;
};

function categoryLabel(categories: BlockCategory[], index: number): string {
  if (index === 0) {
    return `0-${categories[0].maxUnits}`;
  }
  const previous = categories[index - 1].maxUnits ?? 0;
  const current = categories[index].maxUnits;
  return current === null ? `above ${previous}` : `${previous + 1}-${current}`;
}

function calculateBlockBill(input: ElectricityDomesticInput, config: BlockBillConfig): DomesticBillResult {
  const parsedInput = electricityDomesticInputSchema.parse(input);

  const scale = new ElectricityDecimal(parsedInput.billingDays).div(config.standardBillingDays);
  const consumption = new ElectricityDecimal(parsedInput.unitsConsumed);
  const categories = config.categories;

  const proratedBoundary = (units: number) =>
    new ElectricityDecimal(units).mul(scale).toDecimalPlaces(6);

  const selectedIndex = categories.findIndex(
    (category) =>
      category.maxUnits === null ||
      consumption.lessThanOrEqualTo(proratedBoundary(category.maxUnits)),
  );
  const selected = categories[selectedIndex === -1 ? categories.length - 1 : selectedIndex];

  let energyCharge = new ElectricityDecimal(0);
  let fixedCharge = new ElectricityDecimal(0);
  let fixedAssigned = false;
  const blocks: DomesticBillBlock[] = [];

  for (let index = 0; index < selected.blocks.length; index += 1) {
    const block = selected.blocks[index];
    const proratedMin = proratedBoundary(block.minUnits);
    const proratedMax =
      block.maxUnits === null
        ? new ElectricityDecimal(Infinity)
        : proratedBoundary(block.maxUnits);
    let unitsInBlock = consumption.minus(proratedMin);
    if (unitsInBlock.isNegative()) {
      unitsInBlock = new ElectricityDecimal(0);
    }
    const blockWidth = proratedMax.minus(proratedMin);
    if (unitsInBlock.greaterThan(blockWidth)) {
      unitsInBlock = blockWidth;
    }
    const amount = unitsInBlock.mul(decimal(block.energyRatePerKwh));

    energyCharge = energyCharge.plus(amount);
    if (!fixedAssigned && consumption.lessThanOrEqualTo(proratedMax)) {
      fixedCharge = decimal(block.fixedCharge);
      fixedAssigned = true;
    }

    const start = block.minUnits === 0 ? 0 : block.minUnits + 1;
    const end = block.maxUnits === null ? "above" : block.maxUnits;
    blocks.push({
      label: `Block ${index + 1}: ${start}-${end} kWh`,
      units: unitsInBlock.toFixed(2),
      ratePerKwh: block.energyRatePerKwh,
      amount: money(amount),
    });
  }

  const tariffCharge = energyCharge.plus(fixedCharge);
  const sscLAmount = tariffCharge
    .mul(decimal(config.sscLPercent))
    .div(100)
    .toDecimalPlaces(2, ElectricityDecimal.ROUND_HALF_UP);
  const totalPayable = tariffCharge.plus(sscLAmount);

  return {
    category: categoryLabel(categories, selectedIndex === -1 ? categories.length - 1 : selectedIndex),
    energyCharge: money(energyCharge),
    fixedCharge: money(fixedCharge),
    tariffCharge: money(tariffCharge),
    sscLRatePercent: config.sscLPercent,
    sscLAmount: sscLAmount.toFixed(2),
    totalPayable: money(totalPayable),
    blocks,
  };
}

export function calculateDomesticElectricityBill(
  input: ElectricityDomesticInput,
  payload: ElectricityDomesticPayload,
): DomesticBillResult {
  const parsedPayload = electricityDomesticPayloadSchema.parse(payload);

  return calculateBlockBill(input, {
    standardBillingDays: parsedPayload.standardBillingDays,
    categories: parsedPayload.domesticCategories,
    sscLPercent: parsedPayload.sscLPercent,
  });
}

export function calculateReligiousElectricityBill(
  input: ElectricityDomesticInput,
  payload: ElectricityReligiousPayload,
): DomesticBillResult {
  const parsedPayload = electricityReligiousPayloadSchema.parse(payload);

  return calculateBlockBill(input, {
    standardBillingDays: parsedPayload.standardBillingDays,
    categories: parsedPayload.religiousCategories,
    sscLPercent: parsedPayload.sscLPercent,
  });
}

export const electricityNonDomesticCategorySchema = z.enum([
  "religious",
  "gp-1",
  "ip-1",
  "h-1",
  "gv-1",
  "gp-2",
  "ip-2",
  "h-2",
  "gv-2",
  "gp-3",
  "ip-3",
  "h-3",
  "gv-3",
  "street-lighting",
  "agriculture-tou",
  "evcs-1",
  "evcs-2",
]);

export type ElectricityNonDomesticCategory = z.infer<typeof electricityNonDomesticCategorySchema>;

export const NON_DOMESTIC_CATEGORY_LABELS: Record<ElectricityNonDomesticCategory, string> = {
  religious: "Religious & charitable",
  "gp-1": "General purpose GP-1 (Rate 1)",
  "ip-1": "Industrial IP-1 (Rate 1)",
  "h-1": "Hotel H-1 (Rate 1)",
  "gv-1": "Government GV-1 (Rate 1)",
  "gp-2": "General purpose GP-2 (Rate 2)",
  "ip-2": "Industrial IP-2 (Rate 2)",
  "h-2": "Hotel H-2 (Rate 2)",
  "gv-2": "Government GV-2 (Rate 2)",
  "gp-3": "General purpose GP-3 (Rate 3)",
  "ip-3": "Industrial IP-3 (Rate 3)",
  "h-3": "Hotel H-3 (Rate 3)",
  "gv-3": "Government GV-3 (Rate 3)",
  "street-lighting": "Street lighting",
  "agriculture-tou": "Agriculture (optional TOU)",
  "evcs-1": "EV charging station EVCS-1",
  "evcs-2": "EV charging station EVCS-2",
};

const tierSchema = z.object({
  energyRatePerKwh: nonnegativeDecimalStringSchema,
  fixedCharge: nonnegativeMoneyStringSchema,
});

const vdmcTariffSchema = z.object({
  structure: z.literal("v-dmc"),
  thresholdUnits: z.number().int().positive(),
  lowTier: tierSchema,
  highTier: tierSchema,
});

const touTariffSchema = z.object({
  structure: z.literal("tou"),
  peakRatePerKwh: nonnegativeDecimalStringSchema,
  dayRatePerKwh: nonnegativeDecimalStringSchema,
  offPeakRatePerKwh: nonnegativeDecimalStringSchema,
  fixedCharge: nonnegativeMoneyStringSchema,
  demandChargePerKva: nonnegativeMoneyStringSchema.nullable(),
});

const singleRateTariffSchema = z.object({
  structure: z.literal("single-rate"),
  energyRatePerKwh: nonnegativeDecimalStringSchema,
  fixedCharge: nonnegativeMoneyStringSchema,
});

const blockTariffSchema = z
  .object({
    structure: z.literal("block"),
    categories: z.array(categorySchema).min(1),
  })
  .refine((value) => orderedBlockCategories(value.categories), {
    message: "Block tariff categories must be ascending with the open-ended category last and contiguous blocks.",
  });

export const electricityNonDomesticPayloadSchema = z
  .object({
    provider: z.literal("ceb"),
    standardBillingDays: z.number().int().positive(),
    sscLPercent: nonnegativeDecimalStringSchema,
    rounding: z.literal("half-up-cent"),
    categories: z
      .object({
        religious: blockTariffSchema,
        "gp-1": vdmcTariffSchema,
        "ip-1": vdmcTariffSchema,
        "h-1": vdmcTariffSchema,
        "gv-1": vdmcTariffSchema,
        "gp-2": touTariffSchema,
        "ip-2": touTariffSchema,
        "h-2": touTariffSchema,
        "gv-2": touTariffSchema,
        "gp-3": touTariffSchema,
        "ip-3": touTariffSchema,
        "h-3": touTariffSchema,
        "gv-3": touTariffSchema,
        "street-lighting": singleRateTariffSchema,
        "agriculture-tou": touTariffSchema,
        "evcs-1": touTariffSchema,
        "evcs-2": touTariffSchema,
      })
      .strict(),
  })
  .strict();

export const electricityNonDomesticInputSchema = z
  .object({
    category: electricityNonDomesticCategorySchema,
    unitsConsumed: z.number().int().min(0).max(1_000_000).optional(),
    billingDays: z.number().int().min(15).max(62).optional(),
    dayUnits: z.number().int().min(0).max(10_000_000).optional(),
    peakUnits: z.number().int().min(0).max(10_000_000).optional(),
    offPeakUnits: z.number().int().min(0).max(10_000_000).optional(),
    billedDemandKva: z.number().min(0).max(1_000_000).optional(),
  })
  .strict();

export type ElectricityNonDomesticPayload = z.infer<typeof electricityNonDomesticPayloadSchema>;
export type ElectricityNonDomesticInput = z.infer<typeof electricityNonDomesticInputSchema>;

export type NonDomesticBillLine = {
  label: string;
  units: string;
  rate: string;
  amount: string;
};

export type NonDomesticBillResult = {
  category: string;
  categoryKey: ElectricityNonDomesticCategory;
  structure: "block" | "v-dmc" | "tou" | "single-rate";
  tier: string | null;
  lines: NonDomesticBillLine[];
  energyCharge: string;
  fixedCharge: string;
  demandCharge: string;
  tariffCharge: string;
  sscLRatePercent: string;
  sscLAmount: string;
  totalPayable: string;
};

function finalizeNonDomesticBill(input: {
  category: ElectricityNonDomesticCategory;
  structure: "block" | "v-dmc" | "tou" | "single-rate";
  tier: string | null;
  lines: NonDomesticBillLine[];
  energyCharge: InstanceType<typeof ElectricityDecimal>;
  fixedCharge: InstanceType<typeof ElectricityDecimal>;
  demandCharge: InstanceType<typeof ElectricityDecimal>;
  sscLRatePercent: string;
}): NonDomesticBillResult {
  const tariffCharge = input.energyCharge.plus(input.fixedCharge).plus(input.demandCharge);
  const sscLAmount = tariffCharge
    .mul(decimal(input.sscLRatePercent))
    .div(100)
    .toDecimalPlaces(2, ElectricityDecimal.ROUND_HALF_UP);
  const totalPayable = tariffCharge.plus(sscLAmount);

  return {
    category: NON_DOMESTIC_CATEGORY_LABELS[input.category],
    categoryKey: input.category,
    structure: input.structure,
    tier: input.tier,
    lines: input.lines,
    energyCharge: money(input.energyCharge),
    fixedCharge: money(input.fixedCharge),
    demandCharge: money(input.demandCharge),
    tariffCharge: money(tariffCharge),
    sscLRatePercent: input.sscLRatePercent,
    sscLAmount: sscLAmount.toFixed(2),
    totalPayable: money(totalPayable),
  };
}

export function calculateNonDomesticElectricityBill(
  input: ElectricityNonDomesticInput,
  payload: ElectricityNonDomesticPayload,
): NonDomesticBillResult {
  const parsedInput = electricityNonDomesticInputSchema.parse(input);
  const parsedPayload = electricityNonDomesticPayloadSchema.parse(payload);
  const category = parsedInput.category;
  const tariff = parsedPayload.categories[category];
  const sscLRatePercent = parsedPayload.sscLPercent;

  if (tariff.structure === "block") {
    const bill = calculateBlockBill(
      {
        unitsConsumed: parsedInput.unitsConsumed ?? 0,
        billingDays: parsedInput.billingDays ?? parsedPayload.standardBillingDays,
      },
      {
        standardBillingDays: parsedPayload.standardBillingDays,
        categories: tariff.categories,
        sscLPercent: sscLRatePercent,
      },
    );

    return finalizeNonDomesticBill({
      category,
      structure: "block",
      tier: bill.category,
      lines: bill.blocks.map((block) => ({
        label: block.label,
        units: block.units,
        rate: block.ratePerKwh,
        amount: block.amount,
      })),
      energyCharge: decimal(bill.energyCharge),
      fixedCharge: decimal(bill.fixedCharge),
      demandCharge: new ElectricityDecimal(0),
      sscLRatePercent,
    });
  }

  if (tariff.structure === "v-dmc") {
    const scale = new ElectricityDecimal(parsedInput.billingDays ?? parsedPayload.standardBillingDays)
      .div(parsedPayload.standardBillingDays);
    const consumption = new ElectricityDecimal(parsedInput.unitsConsumed ?? 0);
    const proratedThreshold = new ElectricityDecimal(tariff.thresholdUnits)
      .mul(scale)
      .toDecimalPlaces(6);
    const selectedTier = consumption.greaterThan(proratedThreshold)
      ? tariff.highTier
      : tariff.lowTier;
    const amount = consumption.mul(decimal(selectedTier.energyRatePerKwh));
    const tier = selectedTier === tariff.highTier
      ? `Tier 2 (> ${tariff.thresholdUnits} kWh/month)`
      : `Tier 1 (≤ ${tariff.thresholdUnits} kWh/month)`;

    return finalizeNonDomesticBill({
      category,
      structure: "v-dmc",
      tier,
      lines: [{
        label: `Energy at ${tier}`,
        units: consumption.toFixed(2),
        rate: selectedTier.energyRatePerKwh,
        amount: money(amount),
      }],
      energyCharge: amount,
      fixedCharge: decimal(selectedTier.fixedCharge),
      demandCharge: new ElectricityDecimal(0),
      sscLRatePercent,
    });
  }

  if (tariff.structure === "tou") {
    const peak = new ElectricityDecimal(parsedInput.peakUnits ?? 0);
    const day = new ElectricityDecimal(parsedInput.dayUnits ?? 0);
    const offPeak = new ElectricityDecimal(parsedInput.offPeakUnits ?? 0);
    const peakAmount = peak.mul(decimal(tariff.peakRatePerKwh));
    const dayAmount = day.mul(decimal(tariff.dayRatePerKwh));
    const offPeakAmount = offPeak.mul(decimal(tariff.offPeakRatePerKwh));
    const energyCharge = peakAmount.plus(dayAmount).plus(offPeakAmount);
    const demandCharge = tariff.demandChargePerKva === null
      ? new ElectricityDecimal(0)
      : new ElectricityDecimal(parsedInput.billedDemandKva ?? 0).mul(decimal(tariff.demandChargePerKva));

    return finalizeNonDomesticBill({
      category,
      structure: "tou",
      tier: null,
      lines: [
        {
          label: "Peak energy (18:30-22:30)",
          units: peak.toFixed(2),
          rate: tariff.peakRatePerKwh,
          amount: money(peakAmount),
        },
        {
          label: "Day energy (05:30-18:30)",
          units: day.toFixed(2),
          rate: tariff.dayRatePerKwh,
          amount: money(dayAmount),
        },
        {
          label: "Off-peak energy (22:30-05:30)",
          units: offPeak.toFixed(2),
          rate: tariff.offPeakRatePerKwh,
          amount: money(offPeakAmount),
        },
      ],
      energyCharge,
      fixedCharge: decimal(tariff.fixedCharge),
      demandCharge,
      sscLRatePercent,
    });
  }

  const amount = new ElectricityDecimal(parsedInput.unitsConsumed ?? 0)
    .mul(decimal(tariff.energyRatePerKwh));

  return finalizeNonDomesticBill({
    category,
    structure: "single-rate",
    tier: null,
    lines: [{
      label: "Energy",
      units: (parsedInput.unitsConsumed ?? 0).toString(),
      rate: tariff.energyRatePerKwh,
      amount: money(amount),
    }],
    energyCharge: amount,
    fixedCharge: decimal(tariff.fixedCharge),
    demandCharge: new ElectricityDecimal(0),
    sscLRatePercent,
  });
}
