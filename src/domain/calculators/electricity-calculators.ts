import { z } from "zod";

import {
  calculateDomesticElectricityBill,
  calculateNonDomesticElectricityBill,
  electricityDomesticPayloadSchema,
  electricityNonDomesticCategorySchema,
  electricityNonDomesticPayloadSchema,
  NON_DOMESTIC_CATEGORY_LABELS,
  type ElectricityNonDomesticCategory,
} from "@/domain/calculators/energy/electricity";
import {
  integerInput,
  optionalDecimalInput,
  optionalIntegerInput,
} from "@/domain/calculators/input";
import {
  defineRegulatedCalculator,
  type CalculationResult,
  type CalculatorMetadata,
  type RuleDependency,
} from "@/domain/calculators/types";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const asOfDateSchema = z.string().regex(dateOnlyPattern, "Enter a valid calculation date.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calculation date.");

const electricityDomesticRule: RuleDependency = {
  name: "electricity",
  key: "electricity-domestic-standard",
  scope: "standard",
};

const electricityMetadata = {
  key: "electricity-bill",
  name: "Electricity bill calculator",
  shortName: "Electricity bill",
  summary: "Estimate a domestic CEB electricity bill from units consumed and the billing period.",
  category: "Energy",
  classification: "regulated",
  version: "1.0.0",
  accent: "gold",
  fields: [
    { name: "asOfDate", label: "Bill date", type: "date", required: true, min: "2026-05-11", max: "9999-12-31" },
    { name: "unitsConsumed", label: "Units consumed", type: "number", required: true, min: 0, max: 100_000, maxDecimalPlaces: 0, step: 1, suffix: "kWh" },
    { name: "billingDays", label: "Billing period", type: "number", required: true, min: 15, max: 62, maxDecimalPlaces: 0, step: 1, suffix: "days", defaultValue: 30, description: "The number of days the bill covers; tariff block limits are prorated from a 30-day cycle." },
  ],
} satisfies CalculatorMetadata;

const electricityInputSchema = z.object({
  asOfDate: asOfDateSchema,
  unitsConsumed: integerInput({ min: 0, max: 100_000 }),
  billingDays: integerInput({ min: 15, max: 62 }),
}).strict();

export const electricityBillCalculator = defineRegulatedCalculator({
  ...electricityMetadata,
  schema: electricityInputSchema,
  ruleDependencies: [electricityDomesticRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const bill = calculateDomesticElectricityBill(
      {
        unitsConsumed: input.unitsConsumed,
        billingDays: input.billingDays,
      },
      electricityDomesticPayloadSchema.parse(payloads.electricity),
    );

    const sscLRatePercent = bill.sscLRatePercent;
    const result: CalculationResult = {
      calculator: electricityMetadata.key,
      calculationVersion: electricityMetadata.version,
      ruleVersions: [],
      sources: [],
      verifiedAt: null,
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: {
        unitsConsumed: input.unitsConsumed,
        billingDays: input.billingDays,
        category: bill.category,
        energyCharge: bill.energyCharge,
        fixedCharge: bill.fixedCharge,
        tariffCharge: bill.tariffCharge,
        sscLRatePercent,
        sscLAmount: bill.sscLAmount,
        totalPayable: bill.totalPayable,
      },
      breakdown: [
        ...bill.blocks.map((block) => ({
          label: block.label,
          expression: `${block.units} kWh × LKR ${block.ratePerKwh}`,
          value: block.amount,
          unit: "LKR",
        })),
        { label: "Energy charge", value: bill.energyCharge, unit: "LKR" },
        { label: "Fixed charge", value: bill.fixedCharge, unit: "LKR" },
        { label: "Tariff charge", value: bill.tariffCharge, unit: "LKR" },
        { label: `SSCL at ${sscLRatePercent}%`, value: bill.sscLAmount, unit: "LKR" },
        { label: "Total payable", value: bill.totalPayable, unit: "LKR" },
      ],
      assumptions: [
        "The bill uses the PUCSL-approved CEB domestic tariff for the calculation date.",
        `Block limits are prorated from the ${input.billingDays}-day billing period against the standard 30-day cycle.`,
        "The fixed charge is the tier of the block containing the billed consumption.",
        "The SSCL (Social Security Contribution Levy) is added on top of the tariff charge.",
        "VAT is treated as included in the approved tariff charges.",
      ],
      warnings: [
        "Estimate only; the official utility bill remains authoritative.",
        "Provider (CEB/LECO), time-of-use, net-metering, and concession programs can change the bill.",
        "Fuel adjustment and other authorized charges are excluded.",
      ],
    };

    return result;
  },
});

const touCategories = ["gp-2", "ip-2", "h-2", "gv-2", "gp-3", "ip-3", "h-3", "gv-3", "agriculture-tou", "evcs-1", "evcs-2"];
const unitsCategories = ["religious", "gp-1", "ip-1", "h-1", "gv-1", "street-lighting"];
const billingCategories = ["religious", "gp-1", "ip-1", "h-1", "gv-1"];
const demandCategories = ["gp-2", "ip-2", "h-2", "gv-2", "gp-3", "ip-3", "h-3", "gv-3", "evcs-2"];

const nonDomesticCategoryOptions = [
  { label: "Select a tariff category", value: "" },
  ...(Object.entries(NON_DOMESTIC_CATEGORY_LABELS) as Array<[ElectricityNonDomesticCategory, string]>)
    .map(([value, label]) => ({ label, value })),
];

const electricityNonDomesticRule: RuleDependency = {
  name: "electricity",
  key: "electricity-non-domestic-standard",
  scope: "standard",
};

const electricityNonDomesticMetadata = {
  key: "electricity-non-domestic-bill",
  name: "Electricity non-domestic bill calculator",
  shortName: "Electricity business bill",
  summary: "Estimate a CEB non-domestic electricity bill (religious, general purpose, government, industrial, hotel, street lighting, agriculture, or EV charging) from consumption, time-of-use, and demand values.",
  category: "Energy",
  classification: "regulated",
  version: "1.0.0",
  accent: "gold",
  fields: [
    { name: "asOfDate", label: "Bill date", type: "date", required: true, min: "2026-05-11", max: "9999-12-31" },
    { name: "category", label: "Tariff category", type: "select", required: true, options: nonDomesticCategoryOptions, description: "Rate 1 = supply at 400/230 V up to 42 kVA, Rate 2 = 400/230 V above 42 kVA, Rate 3 = 11 kV and above." },
    { name: "unitsConsumed", label: "Units consumed", type: "number", required: true, min: 0, max: 1_000_000, maxDecimalPlaces: 0, step: 1, suffix: "kWh", visibleWhen: { field: "category", in: unitsCategories }, description: "Total monthly consumption for block, volume-differentiated, or street-lighting tariffs." },
    { name: "billingDays", label: "Billing period", type: "number", required: true, min: 15, max: 62, maxDecimalPlaces: 0, step: 1, suffix: "days", defaultValue: 30, visibleWhen: { field: "category", in: billingCategories }, description: "Block and tier limits are prorated from the standard 30-day cycle." },
    { name: "peakUnits", label: "Peak units", type: "number", required: true, min: 0, max: 10_000_000, maxDecimalPlaces: 0, step: 1, suffix: "kWh", visibleWhen: { field: "category", in: touCategories }, description: "Units used 18:30-22:30." },
    { name: "dayUnits", label: "Day units", type: "number", required: true, min: 0, max: 10_000_000, maxDecimalPlaces: 0, step: 1, suffix: "kWh", visibleWhen: { field: "category", in: touCategories }, description: "Units used 05:30-18:30." },
    { name: "offPeakUnits", label: "Off-peak units", type: "number", required: true, min: 0, max: 10_000_000, maxDecimalPlaces: 0, step: 1, suffix: "kWh", visibleWhen: { field: "category", in: touCategories }, description: "Units used 22:30-05:30." },
    { name: "billedDemandKva", label: "Billed maximum demand", type: "number", required: true, min: 0, max: 1_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "kVA", visibleWhen: { field: "category", in: demandCategories }, description: "The maximum demand (kVA) on the bill; Rate 2/3 and EVCS-2 carry a demand charge." },
  ],
} satisfies CalculatorMetadata;

const electricityNonDomesticInputSchema = z
  .object({
    asOfDate: asOfDateSchema,
    category: electricityNonDomesticCategorySchema,
    unitsConsumed: optionalIntegerInput({ min: 0, max: 1_000_000 }),
    billingDays: integerInput({ min: 15, max: 62 }).default(30),
    dayUnits: optionalIntegerInput({ min: 0, max: 10_000_000 }),
    peakUnits: optionalIntegerInput({ min: 0, max: 10_000_000 }),
    offPeakUnits: optionalIntegerInput({ min: 0, max: 10_000_000 }),
    billedDemandKva: optionalDecimalInput({ min: 0, max: 1_000_000, maxDecimalPlaces: 2 })
      .transform((value) => (value === undefined ? undefined : Number(value))),
  })
  .strict()
  .superRefine((input, context) => {
    const isTou = touCategories.includes(input.category);
    const isUnits = unitsCategories.includes(input.category);
    const isDemand = demandCategories.includes(input.category);

    if (isTou) {
      if (input.dayUnits === undefined) {
        context.addIssue({ code: "custom", path: ["dayUnits"], message: "Enter the day-time (05:30-18:30) units for a time-of-use tariff." });
      }
      if (input.peakUnits === undefined) {
        context.addIssue({ code: "custom", path: ["peakUnits"], message: "Enter the peak-time (18:30-22:30) units for a time-of-use tariff." });
      }
      if (input.offPeakUnits === undefined) {
        context.addIssue({ code: "custom", path: ["offPeakUnits"], message: "Enter the off-peak (22:30-05:30) units for a time-of-use tariff." });
      }
      if (input.unitsConsumed !== undefined) {
        context.addIssue({ code: "custom", path: ["unitsConsumed"], message: "Units consumed is not used for a time-of-use tariff." });
      }
    } else if (isUnits) {
      if (input.unitsConsumed === undefined) {
        context.addIssue({ code: "custom", path: ["unitsConsumed"], message: "Enter the units consumed for this tariff." });
      }
      if (input.dayUnits !== undefined || input.peakUnits !== undefined || input.offPeakUnits !== undefined) {
        context.addIssue({ code: "custom", path: ["peakUnits"], message: "Time-of-use units are only used for time-of-use tariffs." });
      }
    }

    if (isDemand) {
      if (input.billedDemandKva === undefined) {
        context.addIssue({ code: "custom", path: ["billedDemandKva"], message: "Enter the billed maximum demand in kVA for this tariff." });
      }
    } else if (input.billedDemandKva !== undefined) {
      context.addIssue({ code: "custom", path: ["billedDemandKva"], message: "The billed demand is not used for this tariff." });
    }
  });

export const electricityNonDomesticBillCalculator = defineRegulatedCalculator({
  ...electricityNonDomesticMetadata,
  schema: electricityNonDomesticInputSchema,
  ruleDependencies: [electricityNonDomesticRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const bill = calculateNonDomesticElectricityBill(
      {
        category: input.category,
        unitsConsumed: input.unitsConsumed,
        billingDays: input.billingDays,
        dayUnits: input.dayUnits,
        peakUnits: input.peakUnits,
        offPeakUnits: input.offPeakUnits,
        billedDemandKva: input.billedDemandKva,
      },
      electricityNonDomesticPayloadSchema.parse(payloads.electricity),
    );

    const demandApplied = bill.demandCharge !== "0.00";
    const result: CalculationResult = {
      calculator: electricityNonDomesticMetadata.key,
      calculationVersion: electricityNonDomesticMetadata.version,
      ruleVersions: [],
      sources: [],
      verifiedAt: null,
      asOfDate: input.asOfDate,
      normalizedInputs: {
        asOfDate: input.asOfDate,
        category: input.category,
        ...(input.unitsConsumed !== undefined ? { unitsConsumed: input.unitsConsumed } : {}),
        ...(input.billingDays !== undefined ? { billingDays: input.billingDays } : {}),
        ...(input.dayUnits !== undefined ? { dayUnits: input.dayUnits } : {}),
        ...(input.peakUnits !== undefined ? { peakUnits: input.peakUnits } : {}),
        ...(input.offPeakUnits !== undefined ? { offPeakUnits: input.offPeakUnits } : {}),
        ...(input.billedDemandKva !== undefined ? { billedDemandKva: input.billedDemandKva } : {}),
      },
      result: {
        category: bill.category,
        categoryKey: bill.categoryKey,
        structure: bill.structure,
        tier: bill.tier ?? "",
        energyCharge: bill.energyCharge,
        fixedCharge: bill.fixedCharge,
        demandCharge: bill.demandCharge,
        tariffCharge: bill.tariffCharge,
        sscLRatePercent: bill.sscLRatePercent,
        sscLAmount: bill.sscLAmount,
        totalPayable: bill.totalPayable,
        ...(input.unitsConsumed !== undefined ? { unitsConsumed: input.unitsConsumed } : {}),
        ...(input.billingDays !== undefined ? { billingDays: input.billingDays } : {}),
        ...(input.dayUnits !== undefined ? { dayUnits: input.dayUnits } : {}),
        ...(input.peakUnits !== undefined ? { peakUnits: input.peakUnits } : {}),
        ...(input.offPeakUnits !== undefined ? { offPeakUnits: input.offPeakUnits } : {}),
        ...(input.billedDemandKva !== undefined ? { billedDemandKva: input.billedDemandKva } : {}),
      },
      breakdown: [
        ...bill.lines.map((line) => ({
          label: line.label,
          expression: `${line.units} kWh × LKR ${line.rate}`,
          value: line.amount,
          unit: "LKR",
        })),
        { label: "Energy charge", value: bill.energyCharge, unit: "LKR" },
        { label: "Fixed charge", value: bill.fixedCharge, unit: "LKR" },
        ...(demandApplied ? [{ label: "Demand charge", value: bill.demandCharge, unit: "LKR" }] : []),
        { label: "Tariff charge", value: bill.tariffCharge, unit: "LKR" },
        { label: `SSCL at ${bill.sscLRatePercent}%`, value: bill.sscLAmount, unit: "LKR" },
        { label: "Total payable", value: bill.totalPayable, unit: "LKR" },
      ],
      assumptions: [
        "The bill uses the PUCSL-approved CEB non-domestic tariff for the calculation date.",
        ...(bill.structure === "block" || bill.structure === "v-dmc" ? [
          `Block and tier limits are prorated from the ${input.billingDays}-day billing period against the standard 30-day cycle.`,
        ] : []),
        ...(bill.structure === "v-dmc" ? [
          "The volume-differentiated rate applies to all units consumed in the month, selected by the consumption tier.",
        ] : []),
        ...(bill.structure === "tou" ? [
          "Time-of-use windows are day 05:30-18:30, peak 18:30-22:30, and off-peak 22:30-05:30.",
        ] : []),
        ...(demandApplied ? [
          `The demand charge applies to the billed maximum demand of ${input.billedDemandKva} kVA.`,
        ] : []),
        "The fixed monthly charge and the SSCL are added on top of the energy and demand charges.",
        "VAT is treated as included in the approved tariff charges.",
      ],
      warnings: [
        "Estimate only; the official utility bill remains authoritative.",
        "The applicable rate depends on the supply class (voltage and contract demand); misclassification changes the bill.",
        "Fuel adjustment, ancillary, and other authorized charges are excluded.",
      ],
    };

    return result;
  },
});
