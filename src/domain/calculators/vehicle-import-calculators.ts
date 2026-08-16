import { z } from "zod";

import { decimal } from "@/domain/calculators/vehicle-import/schemas";
import {
  calculateVehicleImportDuty,
} from "@/domain/calculators/vehicle-import/vehicle-import";
import { vehicleImportPayloadSchema } from "@/domain/calculators/vehicle-import/rates";
import { decimalInput, optionalIntegerInput } from "@/domain/calculators/input";
import {
  defineRegulatedCalculator,
  type CalculationResult,
  type CalculatorMetadata,
  type RuleDependency,
} from "@/domain/calculators/types";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const maximumCifValue = 1_000_000_000_000;

const asOfDateSchema = z.string().regex(dateOnlyPattern, "Enter a valid calculation date.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calculation date.");

const vehicleType = z.enum([
  "petrol",
  "diesel",
  "petrol-hybrid",
  "diesel-hybrid",
  "petrol-phev",
  "diesel-phev",
  "electric",
]);

const vehicleAge = z.enum([
  "not-more-than-one-year",
  "one-to-three-years",
  "more-than-three-years",
]);

const vehicleTypeOptions = [
  { label: "Select the vehicle type", value: "" },
  { label: "Petrol", value: "petrol" },
  { label: "Diesel", value: "diesel" },
  { label: "Petrol hybrid", value: "petrol-hybrid" },
  { label: "Diesel hybrid", value: "diesel-hybrid" },
  { label: "Petrol plug-in hybrid (PHEV)", value: "petrol-phev" },
  { label: "Diesel plug-in hybrid (PHEV)", value: "diesel-phev" },
  { label: "Electric (grid-charged)", value: "electric" },
];

const vehicleAgeOptions = [
  { label: "Select the vehicle age", value: "" },
  { label: "Not more than 1 year old", value: "not-more-than-one-year" },
  { label: "1 to 3 years old", value: "one-to-three-years" },
  { label: "More than 3 years old", value: "more-than-three-years" },
];

const vehicleImportRule: RuleDependency = {
  name: "vehicleImport",
  key: "vehicle-import-excise-nitg-2026",
  scope: "lk",
};

const vehicleImportMetadata = {
  key: "vehicle-import-duty",
  name: "Vehicle import duty calculator",
  shortName: "Vehicle import duty",
  summary: "Estimate the layered import duties and taxes on a motor vehicle under the NITG 2026 Chapter 87 schedule.",
  category: "Vehicle",
  classification: "regulated",
  version: "1.0.0",
  accent: "blue",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2026-04-01", max: "9999-12-31" },
    { name: "vehicleType", label: "Vehicle type", type: "select", required: true, options: vehicleTypeOptions },
    { name: "cifValue", label: "CIF value in LKR", type: "number", required: true, min: 0, max: maximumCifValue, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR", description: "The customs value (cost, insurance, freight) at the port in Sri Lankan rupees." },
    { name: "engineCc", label: "Engine capacity", type: "number", required: true, min: 1, max: 10_000, maxDecimalPlaces: 0, step: 1, suffix: "cc", visibleWhen: { field: "vehicleType", notEquals: "electric" } },
    { name: "motorKw", label: "Motor power", type: "number", required: true, min: 1, max: 2_000, maxDecimalPlaces: 0, step: 1, suffix: "kW", visibleWhen: { field: "vehicleType", equals: "electric" } },
    { name: "vehicleAge", label: "Vehicle age", type: "select", required: true, options: vehicleAgeOptions, description: "Age affects the excise rate for electric vehicles; the NITG 2026 petrol and diesel excise rows are identical across the three-year boundary." },
    { name: "lcEstablishedOn", label: "LC establishment date", type: "date", required: false, min: "2026-04-01", max: "9999-12-31", description: "Optional. If on or before the surcharge order cutoff, the 50% S.P.D. surcharge may be exempt." },
    { name: "shippedOnBoardOn", label: "Shipped-on-board date", type: "date", required: false, min: "2026-04-01", max: "9999-12-31", description: "Optional. The date on the Bill of Lading or Airway Bill, checked against the surcharge order cutoff." },
  ],
} satisfies CalculatorMetadata;

const vehicleImportInputSchema = z
  .object({
    asOfDate: asOfDateSchema,
    vehicleType,
    cifValue: decimalInput({ min: 0, max: maximumCifValue, maxDecimalPlaces: 2 }),
    engineCc: optionalIntegerInput({ min: 1, max: 10_000 }),
    motorKw: optionalIntegerInput({ min: 1, max: 2_000 }),
    vehicleAge,
    lcEstablishedOn: z.string().regex(dateOnlyPattern, "Enter a valid LC establishment date.").optional(),
    shippedOnBoardOn: z.string().regex(dateOnlyPattern, "Enter a valid shipped-on-board date.").optional(),
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

function percent(rate: string): string {
  return decimal(rate).mul(100).toString();
}

function baseResult(
  metadata: Pick<CalculatorMetadata, "key" | "version">,
  values: Omit<CalculationResult, "calculator" | "calculationVersion" | "ruleVersions" | "sources" | "verifiedAt">,
): CalculationResult {
  return {
    calculator: metadata.key,
    calculationVersion: metadata.version,
    ruleVersions: [],
    sources: [],
    verifiedAt: null,
    ...values,
  };
}

export const vehicleImportDutyCalculator = defineRegulatedCalculator({
  ...vehicleImportMetadata,
  schema: vehicleImportInputSchema,
  ruleDependencies: [vehicleImportRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = vehicleImportPayloadSchema.parse(payloads.vehicleImport);
    const calculation = calculateVehicleImportDuty(input, payload);
    const thresholdDisplay = decimal(calculation.luxuryThreshold).toNumber().toLocaleString("en-LK");
    const luxuryExpression = calculation.luxuryTax === "0"
      ? `Not applied (CIF below the LKR ${thresholdDisplay} threshold)`
      : `max(0, CIF LKR ${calculation.cif} − threshold LKR ${thresholdDisplay}) × ${percent(calculation.luxuryRate)}%`;

    return baseResult(vehicleImportMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: {
        vehicleType: calculation.vehicleType,
        scheduleLabel: calculation.scheduleLabel,
        bandLabel: calculation.bandLabel,
        bandUnit: calculation.bandUnit,
        bandValue: calculation.bandValue,
        vehicleAge: calculation.vehicleAge,
        appliedRate: calculation.appliedRate,
        appliedRateUnit: calculation.appliedRateUnit,
        cif: calculation.cif,
        customsDuty: calculation.customsDuty,
        surcharge: calculation.surcharge,
        surchargeRate: calculation.surchargeRate,
        surchargeExemption: calculation.surchargeExemption,
        surchargeExemptionNote: calculation.surchargeExemptionNote,
        excise: calculation.excise,
        luxuryTax: calculation.luxuryTax,
        vatBase: calculation.vatBase,
        vat: calculation.vat,
        sscl: calculation.sscl,
        totalPayable: calculation.totalPayable,
      },
      breakdown: [
        { label: "CIF value", value: calculation.cif, unit: "LKR" },
        {
          label: `Customs import duty at ${percent(calculation.customsDutyRate)}%`,
          expression: `${calculation.cif} × ${percent(calculation.customsDutyRate)}%`,
          value: calculation.customsDuty,
          unit: "LKR",
        },
        {
          label: `Surcharge (S.P.D.) at ${percent(calculation.surchargeRate)}% of customs duty`,
          expression: calculation.surchargeExemption === "applied"
            ? `Exempt: ${calculation.surchargeExemptionNote}`
            : `${calculation.customsDuty} × ${percent(calculation.surchargeRate)}%`,
          value: calculation.surcharge,
          unit: "LKR",
        },
        {
          label: "Excise (Special Provisions) duty",
          expression: calculation.rateExpression,
          value: calculation.excise,
          unit: "LKR",
        },
        {
          label: `Luxury tax at ${percent(calculation.luxuryRate)}% above the threshold`,
          expression: luxuryExpression,
          value: calculation.luxuryTax,
          unit: "LKR",
        },
        {
          label: "VAT base (CIF + 10% of CIF + CID + surcharge + excise)",
          value: calculation.vatBase,
          unit: "LKR",
        },
        {
          label: `VAT at ${percent(calculation.vatRate)}%`,
          expression: `${calculation.vatBase} × ${percent(calculation.vatRate)}%`,
          value: calculation.vat,
          unit: "LKR",
        },
        {
          label: `SSCL at ${percent(calculation.ssclRate)}%`,
          expression: `${calculation.vatBase} × ${percent(calculation.ssclRate)}%`,
          value: calculation.sscl,
          unit: "LKR",
        },
        {
          label: "Total payable (CIF + all duties and taxes)",
          value: calculation.totalPayable,
          unit: "LKR",
        },
      ],
      assumptions: [
        "Rates follow the NITG 2026 Chapter 87 schedule for the calculation date, using the General (Gen) customs duty column of 30%.",
        "The CIF value is the customs value at the port in Sri Lankan rupees; currency conversion is not applied in this version.",
        "VAT and SSCL are charged on the CIF value plus 10% of CIF plus customs duty, surcharge, and excise duty, and the luxury tax is excluded from that base.",
        "The excise duty is the specific rate (per unit or per cc/kW); where a tariff line shows both a per-unit and a per-capacity rate, the higher amount applies.",
        "PAL and CESS are exempt for the motor-car rows of Chapter 87 and are excluded.",
        "For petrol and diesel vehicles the excise rows at and beyond the three-year age boundary carry the same rates in the candidate schedule.",
        ...(calculation.surchargeExemption === "applied" ? [
          "The surcharge exemption follows the current S.P.D. surcharge order and its LC-establishment and shipped-on-board cutoffs.",
        ] : []),
      ],
      warnings: [
        "Estimate only; the customs declaration and the official assessment at the port are authoritative.",
        "The 50% surcharge (S.P.D.) is a time-limited levy and may change; confirm the rate for the entry date.",
        ...(calculation.surchargeExemption === "applied" ? [
          "The exemption is void if key LC details (number of vehicles, vehicle identification number, description, technical specifications, expiry date) were amended.",
        ] : []),
        "Preferential duty origin, excise and duty concessions, used-vehicle import conditions, temporary imports, and other regulatory conditions are excluded.",
        "Professional customs or legal confirmation is recommended before relying on this estimate for a real import.",
        "The candidate rule is pending independent tariff review before production publication.",
      ],
    });
  },
});
