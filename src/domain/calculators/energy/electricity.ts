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

function orderedDomesticCategories(value: {
  domesticCategories: Array<{
    maxUnits: number | null;
    blocks: Array<{ minUnits: number; maxUnits: number | null }>;
  }>;
}): boolean {
  const categories = value.domesticCategories;

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

export const electricityDomesticPayloadSchema = z
  .object({
    provider: z.literal("ceb"),
    standardBillingDays: z.number().int().positive(),
    domesticCategories: z.array(categorySchema).min(1),
    sscLPercent: nonnegativeDecimalStringSchema,
    rounding: z.literal("half-up-cent"),
  })
  .strict()
  .refine(orderedDomesticCategories, {
    message: "Domestic categories must be ascending with the open-ended category last and contiguous blocks.",
  });

export const electricityDomesticInputSchema = z
  .object({
    unitsConsumed: z.number().int().min(0).max(100_000),
    billingDays: z.number().int().min(15).max(62),
  })
  .strict();

export type ElectricityDomesticPayload = z.infer<typeof electricityDomesticPayloadSchema>;
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

function categoryLabel(
  categories: ElectricityDomesticPayload["domesticCategories"],
  index: number,
): string {
  if (index === 0) {
    return `0-${categories[0].maxUnits}`;
  }
  const previous = categories[index - 1].maxUnits ?? 0;
  const current = categories[index].maxUnits;
  return current === null ? `above ${previous}` : `${previous + 1}-${current}`;
}

export function calculateDomesticElectricityBill(
  input: ElectricityDomesticInput,
  payload: ElectricityDomesticPayload,
): DomesticBillResult {
  const parsedInput = electricityDomesticInputSchema.parse(input);
  const parsedPayload = electricityDomesticPayloadSchema.parse(payload);

  const scale = new ElectricityDecimal(parsedInput.billingDays).div(parsedPayload.standardBillingDays);
  const consumption = new ElectricityDecimal(parsedInput.unitsConsumed);
  const categories = parsedPayload.domesticCategories;

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
    .mul(decimal(parsedPayload.sscLPercent))
    .div(100)
    .toDecimalPlaces(2, ElectricityDecimal.ROUND_HALF_UP);
  const totalPayable = tariffCharge.plus(sscLAmount);

  return {
    category: categoryLabel(categories, selectedIndex === -1 ? categories.length - 1 : selectedIndex),
    energyCharge: money(energyCharge),
    fixedCharge: money(fixedCharge),
    tariffCharge: money(tariffCharge),
    sscLRatePercent: parsedPayload.sscLPercent,
    sscLAmount: sscLAmount.toFixed(2),
    totalPayable: money(totalPayable),
    blocks,
  };
}
