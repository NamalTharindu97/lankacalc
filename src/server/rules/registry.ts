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
  electricityDomesticPayloadSchema,
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
};

export function getRulePlatform(): RulePlatform {
  return new RulePlatform(getDatabase(), ruleHandlers);
}
