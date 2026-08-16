import { z } from "zod";

import {
  decimal,
  nonnegativeDecimalStringSchema,
  nonnegativeWholeRupeeStringSchema,
  rateStringSchema,
} from "@/domain/calculators/vehicle-import/schemas";

export const vehicleTypeSchema = z.enum([
  "petrol",
  "diesel",
  "petrol-hybrid",
  "diesel-hybrid",
  "petrol-phev",
  "diesel-phev",
  "electric",
]);

export const vehicleAgeSchema = z.enum([
  "not-more-than-one-year",
  "one-to-three-years",
  "more-than-three-years",
]);

const vehicleAgeRatesSchema = z
  .object({
    "not-more-than-one-year": nonnegativeDecimalStringSchema.optional(),
    "one-to-three-years": nonnegativeDecimalStringSchema.optional(),
    "more-than-three-years": nonnegativeDecimalStringSchema.optional(),
  })
  .strict()
  .refine(
    (rates) =>
      rates["not-more-than-one-year"] !== undefined &&
      rates["one-to-three-years"] !== undefined &&
      rates["more-than-three-years"] !== undefined,
    "Age-rate schedules must define a rate for every vehicle age band.",
  );

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const surchargeExemptionSchema = z
  .object({
    instrument: z.string().min(1).max(300),
    lcEstablishedOnOrBefore: z.string().regex(dateOnlyPattern),
    shippedOnBoardOnOrBefore: z.string().regex(dateOnlyPattern),
  })
  .strict();

const luxuryRateStringSchema = nonnegativeDecimalStringSchema.refine(
  (rate) => decimal(rate).lessThanOrEqualTo(2),
  "Expected a luxury tax rate between 0 and 200%.",
);

const vehicleBandSchema = z
  .object({
    min: z.number().int().positive(),
    max: z.number().int().positive().nullable(),
    ratePerBandUnit: nonnegativeDecimalStringSchema.optional(),
    ageRates: vehicleAgeRatesSchema.optional(),
    perUnitRate: nonnegativeWholeRupeeStringSchema.optional(),
  })
  .strict()
  .refine(
    (band) =>
      band.ratePerBandUnit !== undefined ||
      band.ageRates !== undefined ||
      band.perUnitRate !== undefined,
    "Every vehicle excise band must define at least one rate.",
  )
  .refine(
    (band) => band.ratePerBandUnit === undefined || band.ageRates === undefined,
    "A vehicle excise band must not combine a flat per-band-unit rate with age-band rates.",
  );

const vehicleScheduleSchema = z
  .object({
    vehicleType: vehicleTypeSchema,
    label: z.string().min(1).max(200),
    bandUnit: z.enum(["cc", "kW"]),
    ageSensitive: z.boolean(),
    luxuryThreshold: nonnegativeWholeRupeeStringSchema,
    luxuryRate: luxuryRateStringSchema,
    bands: z.array(vehicleBandSchema).min(1),
  })
  .strict();

function orderedVehicleBands(value: {
  bands: Array<{ min: number; max: number | null }>;
}): boolean {
  const bands = value.bands;

  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    if (index === 0 && band.min !== 1) {
      return false;
    }
    if (band.max !== null && band.max < band.min) {
      return false;
    }
    if (index > 0) {
      const previous = bands[index - 1];
      if (previous.max === null) {
        return false;
      }
      if (band.min !== previous.max + 1) {
        return false;
      }
    }
  }

  return bands[bands.length - 1].max === null;
}

export const vehicleImportPayloadSchema = z
  .object({
    authority: z.literal("srilanka-customs-nitg-2026"),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cidRate: rateStringSchema,
    surchargeRate: rateStringSchema,
    surchargeExemption: surchargeExemptionSchema.optional(),
    vatRate: rateStringSchema,
    ssclRate: rateStringSchema,
    vatBaseCifMultiplier: nonnegativeDecimalStringSchema,
    rounding: z.literal("nearest-whole-rupee"),
    schedules: z.array(vehicleScheduleSchema).min(1),
  })
  .strict()
  .superRefine((payload, context) => {
    const seen = new Set<string>();
    payload.schedules.forEach((schedule, index) => {
      if (seen.has(schedule.vehicleType)) {
        context.addIssue({
          code: "custom",
          path: ["schedules", index, "vehicleType"],
          message: "Schedule vehicle types must be unique.",
        });
      }
      seen.add(schedule.vehicleType);

      const ordered = orderedVehicleBands(schedule);
      if (!ordered) {
        context.addIssue({
          code: "custom",
          path: ["schedules", index, "bands"],
          message: "Bands must start at 1, be contiguous and ascending, and end open-ended.",
        });
      }
    });
  });

export type VehicleImportPayload = z.infer<typeof vehicleImportPayloadSchema>;
export type VehicleImportSchedule = VehicleImportPayload["schedules"][number];
export type VehicleImportBand = VehicleImportSchedule["bands"][number];
export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type VehicleAge = z.infer<typeof vehicleAgeSchema>;
