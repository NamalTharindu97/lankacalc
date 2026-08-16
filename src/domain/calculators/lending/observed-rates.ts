import { z } from "zod";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const dateOnlySchema = z
  .string()
  .regex(dateOnlyPattern, "Enter a valid observation date.");

const percentageStringSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Expected a nonnegative percentage string.")
  .refine(
    (value) => (value.split(".")[1]?.length ?? 0) <= 2,
    "Expected a percentage with no more than 2 decimal places.",
  );

export const observedLendingRateTypeSchema = z.enum(["awpr", "max-motor-vehicle-ltv"]);

export const observedLendingRateSchema = z
  .object({
    rateType: observedLendingRateTypeSchema,
    category: z.string().min(1).max(80).optional(),
    label: z.string().min(1).max(200),
    value: percentageStringSchema,
    observedOn: dateOnlySchema,
  })
  .strict();

export const observedLendingRatesPayloadSchema = z
  .object({
    authority: z.literal("cbsl"),
    effectiveFrom: dateOnlySchema,
    rounding: z.literal("two-decimal-percent"),
    rates: z.array(observedLendingRateSchema).min(1),
  })
  .strict()
  .superRefine((payload, context) => {
    const seen = new Set<string>();
    payload.rates.forEach((rate, index) => {
      const identity = `${rate.rateType}:${rate.category ?? "default"}:${rate.observedOn}`;
      if (seen.has(identity)) {
        context.addIssue({
          code: "custom",
          path: ["rates", index],
          message: "Each rate type and category may have only one observation per date.",
        });
      }
      seen.add(identity);
    });
  });

export const observedRateAsOfInputSchema = z
  .object({
    asOfDate: dateOnlySchema,
  })
  .strict();

export const vehicleClassSchema = z.enum(["motor-car", "three-wheeler", "commercial", "other"]);

export const vehicleLeaseLtvInputSchema = z
  .object({
    asOfDate: dateOnlySchema,
    vehicleClass: vehicleClassSchema,
    vehicleUsedMoreThanOneYear: z.enum(["yes", "no"]).default("no"),
  })
  .strict();

export type ObservedLendingRateType = z.infer<typeof observedLendingRateTypeSchema>;
export type ObservedLendingRate = z.infer<typeof observedLendingRateSchema>;
export type ObservedLendingRatesPayload = z.infer<typeof observedLendingRatesPayloadSchema>;
export type ObservedRateAsOfInput = z.infer<typeof observedRateAsOfInputSchema>;
export type VehicleLeaseLtvInput = z.infer<typeof vehicleLeaseLtvInputSchema>;

export function resolveObservedRate(
  payload: ObservedLendingRatesPayload,
  asOfDate: string,
  rateType: ObservedLendingRateType = "awpr",
  category?: string,
): ObservedLendingRate {
  const candidates = payload.rates.filter(
    (rate) =>
      rate.rateType === rateType &&
      (category === undefined || rate.category === category) &&
      rate.observedOn <= asOfDate,
  );
  if (candidates.length === 0) {
    throw new RangeError(
      `No ${rateType}${category ? ` (${category})` : ""} observation is available on or before ${asOfDate}.`,
    );
  }
  candidates.sort((left, right) => right.observedOn.localeCompare(left.observedOn));
  return candidates[0];
}

export function resolveVehicleLeaseLtvCap(
  payload: ObservedLendingRatesPayload,
  input: VehicleLeaseLtvInput,
): ObservedLendingRate {
  const category =
    input.vehicleUsedMoreThanOneYear === "yes" ? "used" : input.vehicleClass;
  return resolveObservedRate(payload, input.asOfDate, "max-motor-vehicle-ltv", category);
}
