import { describe, expect, it } from "vitest";

import { getCalculator } from "@/domain/calculators/registry";
import { fuelCostCalculator } from "@/domain/calculators/fuel-calculators";
import {
  calculateFuelCost,
  fuelCostInputSchema,
  fuelPumpPricePayloadSchema,
  type FuelPumpPricePayload,
} from "@/domain/calculators/fuel/fuel-cost";

const fuelPumpPricesPayload = {
  fuelPumpPrices: {
    authority: "ceypetco-cpc-sri-lanka",
    effectiveFrom: "2026-06-30",
    rounding: "nearest-cent",
    prices: [
      { fuelType: "petrol-92", label: "Lanka Petrol 92 Octane", pricePerLitre: "414.00" },
      { fuelType: "petrol-95", label: "Lanka Petrol 95 Octane Euro 4", pricePerLitre: "495.00" },
      { fuelType: "auto-diesel", label: "Lanka Auto Diesel", pricePerLitre: "382.00" },
      { fuelType: "super-diesel", label: "Lanka Super Diesel 4 Star Euro 4", pricePerLitre: "478.00" },
    ],
  },
} satisfies { fuelPumpPrices: FuelPumpPricePayload };

describe("regulated fuel cost calculator definition", () => {
  it("registers the fuel cost calculator for server execution", () => {
    expect(getCalculator("fuel-cost")).toMatchObject({
      key: "fuel-cost",
      classification: "configurable",
      execution: "server",
    });
  });

  it("exposes the Ceypetco pump price rule dependency", () => {
    expect(fuelCostCalculator.ruleDependencies).toEqual([
      { name: "fuelPumpPrices", key: "fuel-pump-prices-cpc-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = fuelCostCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        fuelType: "petrol-95",
        distancePerTripKm: "30",
        tripsPerMonth: 40,
        fuelEfficiency: "12",
        pricePerLitreOverride: undefined,
      },
      fuelPumpPricesPayload,
    );

    expect(result).toMatchObject({
      calculator: "fuel-cost",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        fuelType: "petrol-95",
        fuelTypeLabel: "Lanka Petrol 95 Octane Euro 4",
        priceSource: "official",
        officialPricePerLitre: "495.00",
        pricePerLitre: "495.00",
        litresPerTrip: "2.50",
        litresPerMonth: "100.00",
        costPerTrip: "1237.50",
        costPerMonth: "49500.00",
        costPerYear: "594000.00",
        costPerHundredKm: "4125.00",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("fuel cost engine", () => {
  it("uses the official price when no override is entered", () => {
    const result = calculateFuelCost(
      {
        asOfDate: "2026-08-16",
        fuelType: "auto-diesel",
        distancePerTripKm: "50",
        tripsPerMonth: 1,
        fuelEfficiency: "15",
        pricePerLitreOverride: undefined,
      },
      fuelPumpPricesPayload.fuelPumpPrices,
    );

    expect(result).toMatchObject({
      fuelTypeLabel: "Lanka Auto Diesel",
      officialPricePerLitre: "382.00",
      pricePerLitre: "382.00",
      priceSource: "official",
      litresPerTrip: "3.33",
      litresPerMonth: "3.33",
      costPerTrip: "1273.33",
      costPerMonth: "1273.33",
      costPerYear: "15280.00",
      costPerHundredKm: "2546.67",
    });
  });

  it("uses a custom price when the override is entered", () => {
    const result = calculateFuelCost(
      {
        asOfDate: "2026-08-16",
        fuelType: "petrol-95",
        distancePerTripKm: "30",
        tripsPerMonth: 40,
        fuelEfficiency: "12",
        pricePerLitreOverride: "400.00",
      },
      fuelPumpPricesPayload.fuelPumpPrices,
    );

    expect(result).toMatchObject({
      officialPricePerLitre: "495.00",
      pricePerLitre: "400.00",
      priceSource: "user",
      costPerTrip: "1000.00",
      costPerMonth: "40000.00",
    });
  });

  it("rejects an input with no matching official fuel type", () => {
    expect(() =>
      calculateFuelCost(
        {
          asOfDate: "2026-08-16",
          fuelType: "petrol-92",
          distancePerTripKm: "10",
          tripsPerMonth: 1,
          fuelEfficiency: "10",
          pricePerLitreOverride: undefined,
        },
        { ...fuelPumpPricesPayload.fuelPumpPrices, prices: [{ fuelType: "petrol-95", label: "P95", pricePerLitre: "495.00" }] },
      ),
    ).toThrow(RangeError);
  });

  it("validates fuel type and price fields on the payload", () => {
    const duplicated = {
      ...fuelPumpPricesPayload.fuelPumpPrices,
      prices: [
        { fuelType: "petrol-92", label: "P92", pricePerLitre: "414.00" },
        { fuelType: "petrol-92", label: "P92 again", pricePerLitre: "414.00" },
      ],
    };
    expect(() => fuelPumpPricePayloadSchema.parse(duplicated)).toThrow();

    const tooPrecise = {
      ...fuelPumpPricesPayload.fuelPumpPrices,
      prices: [{ fuelType: "petrol-92", label: "P92", pricePerLitre: "414.001" }],
    };
    expect(() => fuelPumpPricePayloadSchema.parse(tooPrecise)).toThrow();
  });

  it("rejects invalid input values through the input schema", () => {
    expect(
      fuelCostInputSchema.safeParse({
        asOfDate: "2026-08-16",
        fuelType: "petrol-95",
        distancePerTripKm: "-1",
        tripsPerMonth: 1,
        fuelEfficiency: "12",
        pricePerLitreOverride: undefined,
      }).success,
    ).toBe(false);

    expect(
      fuelCostInputSchema.safeParse({
        asOfDate: "2026-08-16",
        fuelType: "petrol-95",
        distancePerTripKm: "10",
        tripsPerMonth: 1,
        fuelEfficiency: "12",
        pricePerLitreOverride: "495.001",
      }).success,
    ).toBe(false);
  });
});
