import { z } from "zod";

import {
  calculateDomesticElectricityBill,
  electricityDomesticPayloadSchema,
} from "@/domain/calculators/energy/electricity";
import { integerInput } from "@/domain/calculators/input";
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
