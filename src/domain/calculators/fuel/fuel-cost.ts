import { z } from "zod";

import { cents, decimal, FuelDecimal, nonnegativeCentStringSchema } from "@/domain/calculators/fuel/schemas";
import { decimalInput, integerInput, optionalDecimalInput } from "@/domain/calculators/input";

export const fuelTypeSchema = z.enum([
  "petrol-92",
  "petrol-95",
  "auto-diesel",
  "super-diesel",
]);

export const fuelPriceSchema = z
  .object({
    fuelType: fuelTypeSchema,
    label: z.string().min(1).max(200),
    pricePerLitre: nonnegativeCentStringSchema,
  })
  .strict();

export const fuelPumpPricePayloadSchema = z
  .object({
    authority: z.literal("ceypetco-cpc-sri-lanka"),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rounding: z.literal("nearest-cent"),
    prices: z.array(fuelPriceSchema).min(1),
  })
  .strict()
  .superRefine((payload, context) => {
    const seen = new Set<string>();
    payload.prices.forEach((price, index) => {
      if (seen.has(price.fuelType)) {
        context.addIssue({
          code: "custom",
          path: ["prices", index, "fuelType"],
          message: "Price entries must have unique fuel types.",
        });
      }
      seen.add(price.fuelType);
    });
  });

export const fuelCostInputSchema = z
  .object({
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fuelType: fuelTypeSchema,
    distancePerTripKm: decimalInput({
      positive: true,
      min: 0.01,
      max: 10_000,
      maxDecimalPlaces: 2,
    }),
    tripsPerMonth: integerInput({ min: 1, max: 500 }),
    fuelEfficiency: decimalInput({
      positive: true,
      min: 0.1,
      max: 100,
      maxDecimalPlaces: 2,
    }),
    pricePerLitreOverride: optionalDecimalInput({
      positive: true,
      min: 0.01,
      max: 10_000,
      maxDecimalPlaces: 2,
    }),
  })
  .strict();

export type FuelCostInput = z.infer<typeof fuelCostInputSchema>;
export type FuelPumpPricePayload = z.infer<typeof fuelPumpPricePayloadSchema>;

export type FuelCostResult = {
  fuelType: string;
  fuelTypeLabel: string;
  officialPricePerLitre: string;
  pricePerLitre: string;
  priceSource: "official" | "user";
  litresPerTrip: string;
  litresPerMonth: string;
  costPerTrip: string;
  costPerMonth: string;
  costPerYear: string;
  costPerHundredKm: string;
};

function nearestCent(value: InstanceType<typeof FuelDecimal>): string {
  return value.toDecimalPlaces(2, FuelDecimal.ROUND_HALF_UP).toFixed(2);
}

export function calculateFuelCost(
  input: FuelCostInput,
  payload: FuelPumpPricePayload,
): FuelCostResult {
  const parsedInput = fuelCostInputSchema.parse(input);
  const parsedPayload = fuelPumpPricePayloadSchema.parse(payload);

  const priceRow = parsedPayload.prices.find(
    (price) => price.fuelType === parsedInput.fuelType,
  );
  if (priceRow === undefined) {
    throw new RangeError("No official price is defined for the selected fuel type.");
  }

  const officialPrice = decimal(priceRow.pricePerLitre);
  const usedPrice =
    parsedInput.pricePerLitreOverride !== undefined
      ? decimal(parsedInput.pricePerLitreOverride)
      : officialPrice;
  const efficiency = decimal(parsedInput.fuelEfficiency);

  const litresPerTrip = decimal(parsedInput.distancePerTripKm).div(efficiency);
  const litresPerMonth = litresPerTrip.mul(parsedInput.tripsPerMonth);
  const costPerTrip = litresPerTrip.mul(usedPrice);
  const costPerMonth = litresPerMonth.mul(usedPrice);
  const costPerYear = costPerMonth.mul(12);
  const costPerHundredKm = decimal(100).div(efficiency).mul(usedPrice);

  return {
    fuelType: parsedInput.fuelType,
    fuelTypeLabel: priceRow.label,
    officialPricePerLitre: cents(officialPrice),
    pricePerLitre: cents(usedPrice),
    priceSource:
      parsedInput.pricePerLitreOverride !== undefined ? "user" : "official",
    litresPerTrip: nearestCent(litresPerTrip),
    litresPerMonth: nearestCent(litresPerMonth),
    costPerTrip: nearestCent(costPerTrip),
    costPerMonth: nearestCent(costPerMonth),
    costPerYear: nearestCent(costPerYear),
    costPerHundredKm: nearestCent(costPerHundredKm),
  };
}
