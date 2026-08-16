import { z } from "zod";

import {
  decimal,
  nonnegativeDecimalStringSchema,
  VehicleImportDecimal,
  type VehicleImportDecimalType,
} from "@/domain/calculators/vehicle-import/schemas";
import {
  vehicleAgeSchema,
  vehicleImportPayloadSchema,
  vehicleTypeSchema,
  type VehicleAge,
  type VehicleImportPayload,
  type VehicleType,
} from "@/domain/calculators/vehicle-import/rates";

export const vehicleImportInputSchema = z
  .object({
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    vehicleType: vehicleTypeSchema,
    cifValue: nonnegativeDecimalStringSchema,
    engineCc: z.number().int().positive().max(10_000).optional(),
    motorKw: z.number().int().positive().max(2_000).optional(),
    vehicleAge: vehicleAgeSchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.vehicleType === "electric") {
      if (input.motorKw === undefined) {
        context.addIssue({
          code: "custom",
          path: ["motorKw"],
          message: "Enter the motor power in kW for an electric vehicle.",
        });
      }
      if (input.engineCc !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["engineCc"],
          message: "Engine capacity is not used for an electric vehicle.",
        });
      }
    } else if (input.engineCc === undefined) {
      context.addIssue({
        code: "custom",
        path: ["engineCc"],
        message: "Enter the engine capacity in cc for this vehicle type.",
      });
    } else if (input.motorKw !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["motorKw"],
        message: "Motor power in kW is only used for an electric vehicle.",
      });
    }
  });

export type VehicleImportInput = z.infer<typeof vehicleImportInputSchema>;

export type VehicleImportBandSelection = {
  vehicleType: VehicleType;
  scheduleLabel: string;
  bandLabel: string;
  bandUnit: "cc" | "kW";
  bandValue: number;
  vehicleAge: VehicleAge;
  appliedRate: string;
  appliedRateUnit: string;
  rateExpression: string;
};

export type VehicleImportCalculation = VehicleImportBandSelection & {
  cif: string;
  customsDuty: string;
  customsDutyRate: string;
  surcharge: string;
  surchargeRate: string;
  excise: string;
  vatBase: string;
  vat: string;
  vatRate: string;
  sscl: string;
  ssclRate: string;
  luxuryThreshold: string;
  luxuryRate: string;
  luxuryTax: string;
  totalPayable: string;
};

function nearestWholeRupee(value: VehicleImportDecimalType): VehicleImportDecimalType {
  return value.toDecimalPlaces(0, VehicleImportDecimal.ROUND_HALF_UP);
}

function format(value: VehicleImportDecimalType): string {
  return value.toFixed(0);
}

function rateSelection(
  band: VehicleImportPayload["schedules"][number]["bands"][number],
  vehicleAge: VehicleAge,
  isElectric: boolean,
  bandValue: number,
) {
  let perBandRate: VehicleImportDecimalType | null = null;
  if (band.ratePerBandUnit !== undefined) {
    perBandRate = decimal(band.ratePerBandUnit);
  } else if (band.ageRates !== undefined) {
    const ageRate = band.ageRates[vehicleAge];
    if (ageRate === undefined) {
      throw new RangeError("No excise rate is defined for the entered vehicle age.");
    }
    perBandRate = decimal(ageRate);
  }
  const perUnitRate = band.perUnitRate !== undefined ? decimal(band.perUnitRate) : null;
  const unitLabel = isElectric ? "kW" : "cc";

  if (perBandRate !== null && perUnitRate !== null) {
    const perBandCharge = perBandRate.mul(bandValue);
    return {
      excise: nearestWholeRupee(VehicleImportDecimal.max(perBandCharge, perUnitRate)),
      appliedRate: perUnitRate.greaterThanOrEqualTo(perBandCharge)
        ? perUnitRate.toString()
        : perBandRate.toString(),
      appliedRateUnit: perUnitRate.greaterThanOrEqualTo(perBandCharge) ? "per unit" : `per ${unitLabel}`,
      rateExpression: `max(${perUnitRate.toString()} per unit, ${perBandRate.toString()} per ${unitLabel} × ${bandValue})`,
    };
  }

  if (perBandRate !== null) {
    return {
      excise: nearestWholeRupee(perBandRate.mul(bandValue)),
      appliedRate: perBandRate.toString(),
      appliedRateUnit: `per ${unitLabel}`,
      rateExpression: `${perBandRate.toString()} per ${unitLabel} × ${bandValue}`,
    };
  }

  if (perUnitRate === null) {
    throw new RangeError("The selected excise band defines no rate.");
  }
  return {
    excise: nearestWholeRupee(perUnitRate),
    appliedRate: perUnitRate.toString(),
    appliedRateUnit: "per unit",
    rateExpression: `${perUnitRate.toString()} per unit`,
  };
}

export function calculateVehicleImportDuty(
  input: VehicleImportInput,
  payload: VehicleImportPayload,
): VehicleImportCalculation {
  const parsedInput = vehicleImportInputSchema.parse(input);
  const parsedPayload = vehicleImportPayloadSchema.parse(payload);

  const schedule = parsedPayload.schedules.find(
    (candidate) => candidate.vehicleType === parsedInput.vehicleType,
  );
  if (!schedule) {
    throw new RangeError("No tariff schedule covers the entered vehicle type.");
  }

  const isElectric = schedule.bandUnit === "kW";
  const bandValue = isElectric ? parsedInput.motorKw : parsedInput.engineCc;
  if (bandValue === undefined) {
    throw new RangeError("The entered vehicle requires a capacity or power value.");
  }

  const band = schedule.bands.find(
    (candidate) =>
      candidate.min <= bandValue && (candidate.max === null || bandValue <= candidate.max),
  );
  if (!band) {
    throw new RangeError("No excise band covers the entered vehicle capacity or power.");
  }

  const { excise, appliedRate, appliedRateUnit, rateExpression } = rateSelection(
    band,
    parsedInput.vehicleAge,
    isElectric,
    bandValue,
  );

  const cif = decimal(parsedInput.cifValue);
  const customsDuty = nearestWholeRupee(cif.mul(decimal(parsedPayload.cidRate)));
  const surcharge = nearestWholeRupee(customsDuty.mul(decimal(parsedPayload.surchargeRate)));
  const luxuryBase = cif.minus(decimal(schedule.luxuryThreshold));
  const luxuryTax = luxuryBase.isPositive()
    ? nearestWholeRupee(luxuryBase.mul(decimal(schedule.luxuryRate)))
    : new VehicleImportDecimal(0);
  const vatBase = nearestWholeRupee(
    cif.mul(decimal(parsedPayload.vatBaseCifMultiplier)).plus(customsDuty).plus(excise).plus(surcharge),
  );
  const vat = nearestWholeRupee(vatBase.mul(decimal(parsedPayload.vatRate)));
  const sscl = nearestWholeRupee(vatBase.mul(decimal(parsedPayload.ssclRate)));

  const totalPayable = cif
    .plus(customsDuty)
    .plus(surcharge)
    .plus(excise)
    .plus(luxuryTax)
    .plus(vat)
    .plus(sscl);

  return {
    vehicleType: schedule.vehicleType,
    scheduleLabel: schedule.label,
    bandLabel:
      band.min === band.max
        ? String(band.min)
        : band.max === null
          ? `${band.min}+`
          : `${band.min}-${band.max}`,
    bandUnit: schedule.bandUnit,
    bandValue,
    vehicleAge: parsedInput.vehicleAge,
    appliedRate,
    appliedRateUnit,
    rateExpression,
    cif: format(cif),
    customsDuty: format(customsDuty),
    customsDutyRate: parsedPayload.cidRate,
    surcharge: format(surcharge),
    surchargeRate: parsedPayload.surchargeRate,
    excise: format(excise),
    vatBase: format(vatBase),
    vat: format(vat),
    vatRate: parsedPayload.vatRate,
    sscl: format(sscl),
    ssclRate: parsedPayload.ssclRate,
    luxuryThreshold: schedule.luxuryThreshold,
    luxuryRate: schedule.luxuryRate,
    luxuryTax: format(luxuryTax),
    totalPayable: format(totalPayable),
  };
}
