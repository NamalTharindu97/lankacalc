import { getDatabase } from "@/server/db/client";
import {
  apitPayloadSchema,
  calculateApit,
  calculateEpf,
  calculateEtf,
  epfPayloadSchema,
  etfPayloadSchema,
} from "@/domain/calculators/employment";
import {
  calculateDomesticElectricityBill,
  calculateNonDomesticElectricityBill,
  electricityDomesticPayloadSchema,
  electricityNonDomesticPayloadSchema,
} from "@/domain/calculators/energy/electricity";
import {
  calculateVehicleImportDuty,
  vehicleImportInputSchema,
} from "@/domain/calculators/vehicle-import/vehicle-import";
import { vehicleImportPayloadSchema } from "@/domain/calculators/vehicle-import/rates";
import {
  calculateFuelCost,
  fuelCostInputSchema,
  fuelPumpPricePayloadSchema,
} from "@/domain/calculators/fuel/fuel-cost";
import {
  calculateSolarCost,
  solarAssumptionsPayloadSchema,
  solarCostInputSchema,
} from "@/domain/calculators/solar/solar-cost";
import {
  businessIncomeTaxInputSchema,
  businessIncomeTaxPayloadSchema,
  calculateBusinessIncomeTax,
} from "@/domain/calculators/business-tax/business-income-tax";
import {
  calculateVatLiability,
  vatLiabilityInputSchema,
  vatLiabilityPayloadSchema,
} from "@/domain/calculators/business-tax/vat-liability";
import {
  calculateWithholdingTax,
  withholdingTaxInputSchema,
  withholdingTaxPayloadSchema,
} from "@/domain/calculators/business-tax/withholding-tax";
import {
  calculateFreelanceTaxEstimate,
  freelanceTaxEstimateInputSchema,
  freelanceTaxEstimatePayloadSchema,
} from "@/domain/calculators/business-tax/freelance-tax-estimate";
import {
  calculateSsclCheck,
  ssclCheckInputSchema,
  ssclCheckPayloadSchema,
} from "@/domain/calculators/business-tax/sscl-check";
import {
  observedLendingRatesPayloadSchema,
  observedRateAsOfInputSchema,
  resolveObservedRate,
  resolveVehicleLeaseLtvCap,
  vehicleLeaseLtvInputSchema,
} from "@/domain/calculators/lending/observed-rates";
import type { JsonValue } from "@/server/rules/json";
import { RulePlatform, type RuleHandler } from "@/server/rules/service";

function result(value: unknown): JsonValue {
  return value as JsonValue;
}

export const ruleHandlers: Readonly<Record<string, RuleHandler>> = {
  "apit-primary-regular-monthly": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      apitPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(calculateApit(input as never, apitPayloadSchema.parse(payload)));
    },
  },
  "epf-standard-contribution": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      epfPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(calculateEpf(input as never, epfPayloadSchema.parse(payload)));
    },
  },
  "etf-standard-contribution": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      etfPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(calculateEtf(input as never, etfPayloadSchema.parse(payload)));
    },
  },
  "electricity-domestic-standard": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      electricityDomesticPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateDomesticElectricityBill(
          input as never,
          electricityDomesticPayloadSchema.parse(payload),
        ),
      );
    },
  },
  "electricity-non-domestic-standard": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      electricityNonDomesticPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateNonDomesticElectricityBill(
          input as never,
          electricityNonDomesticPayloadSchema.parse(payload),
        ),
      );
    },
  },
  "vehicle-import-excise-nitg-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      vehicleImportPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateVehicleImportDuty(
          vehicleImportInputSchema.parse(input),
          vehicleImportPayloadSchema.parse(payload),
        ),
      );
    },
  },
  "fuel-pump-prices-cpc-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      fuelPumpPricePayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateFuelCost(
          fuelCostInputSchema.parse(input),
          fuelPumpPricePayloadSchema.parse(payload),
        ),
      );
    },
  },
  "observed-lending-rates-lk-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      observedLendingRatesPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        resolveObservedRate(
          observedLendingRatesPayloadSchema.parse(payload),
          observedRateAsOfInputSchema.parse(input).asOfDate,
          "awpr",
        ),
      );
    },
  },
  "vehicle-lease-ltv-lk-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      observedLendingRatesPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        resolveVehicleLeaseLtvCap(
          observedLendingRatesPayloadSchema.parse(payload),
          vehicleLeaseLtvInputSchema.parse(input),
        ),
      );
    },
  },
  "solar-assumptions-lk-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      solarAssumptionsPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateSolarCost(
          solarCostInputSchema.parse(input),
          solarAssumptionsPayloadSchema.parse(payload),
        ),
      );
    },
  },
  "business-income-tax-lk-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      businessIncomeTaxPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateBusinessIncomeTax(
          businessIncomeTaxInputSchema.parse(input),
          businessIncomeTaxPayloadSchema.parse(payload),
        ),
      );
    },
  },
  "vat-liability-lk-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      vatLiabilityPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateVatLiability(
          vatLiabilityInputSchema.parse(input),
          vatLiabilityPayloadSchema.parse(payload),
        ),
      );
    },
  },
  "withholding-tax-lk-2026": {
    payloadSchemaVersion: "2",
    validatePayload(payload) {
      withholdingTaxPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateWithholdingTax(
          withholdingTaxInputSchema.parse(input),
          withholdingTaxPayloadSchema.parse(payload),
        ),
      );
    },
  },
  "freelance-tax-estimate-lk-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      freelanceTaxEstimatePayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateFreelanceTaxEstimate(
          freelanceTaxEstimateInputSchema.parse(input),
          freelanceTaxEstimatePayloadSchema.parse(payload),
        ),
      );
    },
  },
  "sscl-lk-2026": {
    payloadSchemaVersion: "1",
    validatePayload(payload) {
      ssclCheckPayloadSchema.parse(payload);
    },
    calculate(input, payload) {
      return result(
        calculateSsclCheck(
          ssclCheckInputSchema.parse(input),
          ssclCheckPayloadSchema.parse(payload),
        ),
      );
    },
  },
};

export function getRulePlatform(): RulePlatform {
  return new RulePlatform(getDatabase(), ruleHandlers);
}
