import { describe, expect, it } from "vitest";

import { getCalculator } from "@/domain/calculators/registry";
import { vehicleImportDutyCalculator } from "@/domain/calculators/vehicle-import-calculators";

const vehicleImportPayloads = {
  vehicleImport: {
    authority: "srilanka-customs-nitg-2026",
    effectiveFrom: "2026-04-01",
    cidRate: "0.30",
    surchargeRate: "0.50",
    surchargeExemption: {
      instrument: "S.P.D. surcharge order 2026-08-15 to 2026-12-31",
      lcEstablishedOnOrBefore: "2026-05-15",
      shippedOnBoardOnOrBefore: "2026-11-15",
    },
    vatRate: "0.18",
    ssclRate: "0.025",
    vatBaseCifMultiplier: "1.10",
    rounding: "nearest-whole-rupee",
    schedules: [
      {
        vehicleType: "petrol",
        label: "Petrol engine",
        bandUnit: "cc",
        ageSensitive: false,
        luxuryThreshold: "5000000",
        luxuryRate: "1.00",
        bands: [
          { min: 1, max: 1000, ratePerBandUnit: "2450", perUnitRate: "1992000" },
          { min: 1001, max: 1300, ratePerBandUnit: "3850" },
          { min: 1301, max: 1500, ratePerBandUnit: "4450" },
          { min: 1501, max: 1600, ratePerBandUnit: "5150" },
          { min: 1601, max: 1800, ratePerBandUnit: "6400" },
          { min: 1801, max: 2000, ratePerBandUnit: "7700" },
          { min: 2001, max: 2500, ratePerBandUnit: "8450" },
          { min: 2501, max: 2750, ratePerBandUnit: "9650" },
          { min: 2751, max: 3000, ratePerBandUnit: "10850" },
          { min: 3001, max: 4000, ratePerBandUnit: "12050" },
          { min: 4001, max: null, ratePerBandUnit: "13300" },
        ],
      },
      {
        vehicleType: "diesel",
        label: "Diesel engine",
        bandUnit: "cc",
        ageSensitive: false,
        luxuryThreshold: "5000000",
        luxuryRate: "1.20",
        bands: [
          { min: 1, max: 1500, ratePerBandUnit: "5550" },
          { min: 1501, max: 1600, ratePerBandUnit: "6950" },
          { min: 1601, max: 1800, ratePerBandUnit: "8300" },
          { min: 1801, max: 2000, ratePerBandUnit: "9650" },
          { min: 2001, max: 2500, ratePerBandUnit: "9650" },
          { min: 2501, max: 2750, ratePerBandUnit: "10850" },
          { min: 2751, max: 3000, ratePerBandUnit: "12050" },
          { min: 3001, max: 4000, ratePerBandUnit: "13300" },
          { min: 4001, max: null, ratePerBandUnit: "14500" },
        ],
      },
      {
        vehicleType: "petrol-hybrid",
        label: "Petrol hybrid",
        bandUnit: "cc",
        ageSensitive: false,
        luxuryThreshold: "5500000",
        luxuryRate: "0.80",
        bands: [
          { min: 1, max: 1000, perUnitRate: "1810900" },
          { min: 1001, max: 1300, ratePerBandUnit: "2750" },
          { min: 1301, max: 1500, ratePerBandUnit: "3450" },
          { min: 1501, max: 1600, ratePerBandUnit: "4800" },
          { min: 1601, max: 1800, ratePerBandUnit: "6300" },
          { min: 1801, max: 2000, ratePerBandUnit: "6900" },
          { min: 2001, max: 2500, ratePerBandUnit: "7250" },
          { min: 2501, max: 2750, ratePerBandUnit: "8450" },
          { min: 2751, max: 3000, ratePerBandUnit: "9650" },
          { min: 3001, max: 4000, ratePerBandUnit: "10850" },
          { min: 4001, max: null, ratePerBandUnit: "12050" },
        ],
      },
      {
        vehicleType: "diesel-hybrid",
        label: "Diesel hybrid",
        bandUnit: "cc",
        ageSensitive: false,
        luxuryThreshold: "5500000",
        luxuryRate: "0.90",
        bands: [
          { min: 1, max: 1500, ratePerBandUnit: "4150" },
          { min: 1501, max: 1600, ratePerBandUnit: "5550" },
          { min: 1601, max: 1800, ratePerBandUnit: "6900" },
          { min: 1801, max: 2000, ratePerBandUnit: "8350" },
          { min: 2001, max: 2500, ratePerBandUnit: "8450" },
          { min: 2501, max: 2750, ratePerBandUnit: "9650" },
          { min: 2751, max: 3000, ratePerBandUnit: "10850" },
          { min: 3001, max: 4000, ratePerBandUnit: "12050" },
          { min: 4001, max: null, ratePerBandUnit: "13300" },
        ],
      },
      {
        vehicleType: "petrol-phev",
        label: "Petrol plug-in hybrid",
        bandUnit: "cc",
        ageSensitive: false,
        luxuryThreshold: "5500000",
        luxuryRate: "0.80",
        bands: [
          { min: 1, max: 1000, perUnitRate: "1810900" },
          { min: 1001, max: 1300, ratePerBandUnit: "2750" },
          { min: 1301, max: 1500, ratePerBandUnit: "3450" },
          { min: 1501, max: 1600, ratePerBandUnit: "4800" },
          { min: 1601, max: 1800, ratePerBandUnit: "6250" },
          { min: 1801, max: 2000, ratePerBandUnit: "6900" },
          { min: 2001, max: 2500, ratePerBandUnit: "7250" },
          { min: 2501, max: 2750, ratePerBandUnit: "8450" },
          { min: 2751, max: 3000, ratePerBandUnit: "9650" },
          { min: 3001, max: 4000, ratePerBandUnit: "10850" },
          { min: 4001, max: null, ratePerBandUnit: "12050" },
        ],
      },
      {
        vehicleType: "diesel-phev",
        label: "Diesel plug-in hybrid",
        bandUnit: "cc",
        ageSensitive: false,
        luxuryThreshold: "5500000",
        luxuryRate: "0.90",
        bands: [
          { min: 1, max: 1500, ratePerBandUnit: "4150" },
          { min: 1501, max: 1600, ratePerBandUnit: "5550" },
          { min: 1601, max: 1800, ratePerBandUnit: "6900" },
          { min: 1801, max: 2000, ratePerBandUnit: "8300" },
          { min: 2001, max: 2500, ratePerBandUnit: "8450" },
          { min: 2501, max: 2750, ratePerBandUnit: "9650" },
          { min: 2751, max: 3000, ratePerBandUnit: "10850" },
          { min: 3001, max: 4000, ratePerBandUnit: "12050" },
          { min: 4001, max: null, ratePerBandUnit: "13300" },
        ],
      },
      {
        vehicleType: "electric",
        label: "Electric (grid-charged)",
        bandUnit: "kW",
        ageSensitive: true,
        luxuryThreshold: "6000000",
        luxuryRate: "0.60",
        bands: [
          {
            min: 1,
            max: 50,
            ageRates: {
              "not-more-than-one-year": "18100",
              "one-to-three-years": "36200",
              "more-than-three-years": "48300",
            },
          },
          {
            min: 51,
            max: 100,
            ageRates: {
              "not-more-than-one-year": "24100",
              "one-to-three-years": "36200",
              "more-than-three-years": "72400",
            },
          },
          {
            min: 101,
            max: 200,
            ageRates: {
              "not-more-than-one-year": "36200",
              "one-to-three-years": "60400",
              "more-than-three-years": "108700",
            },
          },
          {
            min: 201,
            max: null,
            ageRates: {
              "not-more-than-one-year": "96600",
              "one-to-three-years": "132800",
              "more-than-three-years": "144900",
            },
          },
        ],
      },
    ],
  },
};

describe("regulated vehicle import duty calculator definition", () => {
  it("registers the vehicle import calculator for server execution", () => {
    expect(getCalculator("vehicle-import-duty")).toMatchObject({
      key: "vehicle-import-duty",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the NITG 2026 excise rule dependency", () => {
    expect(vehicleImportDutyCalculator.ruleDependencies).toEqual([
      { name: "vehicleImport", key: "vehicle-import-excise-nitg-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "petrol",
        cifValue: "3000000",
        engineCc: 1800,
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    );

    expect(result).toMatchObject({
      calculator: "vehicle-import-duty",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        vehicleType: "petrol",
        scheduleLabel: "Petrol engine",
        bandLabel: "1601-1800",
        appliedRate: "6400",
        appliedRateUnit: "per cc",
        cif: "3000000",
        customsDuty: "900000",
        surcharge: "450000",
        excise: "11520000",
        luxuryTax: "0",
        vat: "2910600",
        sscl: "404250",
        totalPayable: "19184850",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });
});

describe("vehicle import duty engine", () => {
  it("charges the higher of the per-unit and per-cc rate for petrol up to 1000 cc", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "petrol",
        cifValue: "2000000",
        engineCc: 1000,
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      bandLabel: "1-1000",
      excise: "2450000",
      vatBase: "5550000",
      vat: "999000",
      sscl: "138750",
      luxuryTax: "0",
      totalPayable: "6487750",
    });
  });

  it("moves a petrol vehicle into the next band at exactly 1001 cc", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "petrol",
        cifValue: "2000000",
        engineCc: 1001,
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({ bandLabel: "1001-1300", excise: "3853850" });
  });

  it("applies the luxury tax only on the CIF value above the threshold", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "petrol",
        cifValue: "6000000",
        engineCc: 2000,
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      bandLabel: "1801-2000",
      excise: "15400000",
      luxuryTax: "1000000",
      vat: "4446000",
      sscl: "617500",
      totalPayable: "30163500",
    });
  });

  it("applies the diesel hybrid schedule with its own 8,350 rate at 1801-2000 cc", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "diesel-hybrid",
        cifValue: "4000000",
        engineCc: 2000,
        vehicleAge: "one-to-three-years",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      scheduleLabel: "Diesel hybrid",
      bandLabel: "1801-2000",
      appliedRate: "8350",
      excise: "16700000",
      luxuryTax: "0",
      vat: "4122000",
      sscl: "572500",
      totalPayable: "27194500",
    });
  });

  it("uses the age-sensitive kW band rate for an electric vehicle", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "electric",
        cifValue: "8000000",
        motorKw: 120,
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      scheduleLabel: "Electric (grid-charged)",
      bandLabel: "101-200",
      appliedRate: "36200",
      appliedRateUnit: "per kW",
      excise: "4344000",
      luxuryTax: "1200000",
      vat: "3013920",
      sscl: "418600",
      totalPayable: "20576520",
    });
  });

  it("applies the higher 1-to-3-year kW rate within the first electric band", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "electric",
        cifValue: "3000000",
        motorKw: 40,
        vehicleAge: "one-to-three-years",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      bandLabel: "1-50",
      excise: "1448000",
      luxuryTax: "0",
      vat: "1097640",
      sscl: "152450",
      totalPayable: "7048090",
    });
  });

  it("treats 50 kW in the lower electric band and 51 kW in the next", () => {
    const lower = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "electric",
        cifValue: "1000000",
        motorKw: 50,
        vehicleAge: "more-than-three-years",
      },
      vehicleImportPayloads,
    );
    const upper = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "electric",
        cifValue: "1000000",
        motorKw: 51,
        vehicleAge: "more-than-three-years",
      },
      vehicleImportPayloads,
    );

    expect(lower.result).toMatchObject({ bandLabel: "1-50", appliedRate: "48300" });
    expect(upper.result).toMatchObject({ bandLabel: "51-100", appliedRate: "72400" });
  });

  it("rejects an electric vehicle without a motor power", () => {
    expect(() => vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "electric",
        cifValue: "3000000",
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    )).toThrow("Enter the motor power in kW for an electric vehicle.");
  });

  it("treats an empty hidden motor power field as absent for a petrol vehicle", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "petrol",
        cifValue: "3000000",
        engineCc: 1800,
        motorKw: "",
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({ bandLabel: "1601-1800", excise: "11520000" });
  });

  it("treats an empty hidden engine capacity field as absent for an electric vehicle", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "electric",
        cifValue: "3000000",
        engineCc: "",
        motorKw: 40,
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({ bandLabel: "1-50", excise: "724000" });
  });

  it("rejects a petrol vehicle without an engine capacity", () => {
    expect(() => vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "petrol",
        cifValue: "3000000",
        vehicleAge: "not-more-than-one-year",
      },
      vehicleImportPayloads,
    )).toThrow("Enter the engine capacity in cc for this vehicle type.");
  });

  it("rejects a payload with non-contiguous excise bands", () => {
    const malformed = {
      vehicleImport: {
        ...vehicleImportPayloads.vehicleImport,
        schedules: [{
          vehicleType: "petrol",
          label: "Petrol engine",
          bandUnit: "cc",
          ageSensitive: false,
          luxuryThreshold: "5000000",
          luxuryRate: "1.00",
          bands: [
            { min: 1, max: 1000, ratePerBandUnit: "2450" },
            { min: 1201, max: null, ratePerBandUnit: "3850" },
          ],
        }],
      },
    };
    expect(() => vehicleImportDutyCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        vehicleType: "petrol",
        cifValue: "3000000",
        engineCc: 800,
        vehicleAge: "not-more-than-one-year",
      },
      malformed,
    )).toThrow();
  });
});

describe("vehicle import duty surcharge LC exemption", () => {
  const baseInput = {
    asOfDate: "2026-08-16",
    vehicleType: "petrol",
    cifValue: "3000000",
    engineCc: 1800,
    vehicleAge: "not-more-than-one-year",
  } as const;

  it("waives the surcharge when the LC was established on the order cutoff", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        ...baseInput,
        lcEstablishedOn: "2026-05-15",
        shippedOnBoardOn: "2026-08-01",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      surcharge: "0",
      surchargeExemption: "applied",
      totalPayable: "18642600",
    });
    expect(result.breakdown.some((item) => item.label.includes("Surcharge") && item.value === "0")).toBe(true);
  });

  it("treats the exemption as applied when the shipped-on-board date is omitted but the LC qualifies", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        ...baseInput,
        lcEstablishedOn: "2026-04-10",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      surcharge: "0",
      surchargeExemption: "applied",
    });
    expect(String(result.result.surchargeExemptionNote)).toContain("confirm the shipped-on-board");
  });

  it("charges the surcharge when the LC was established after the order cutoff", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        ...baseInput,
        lcEstablishedOn: "2026-05-16",
        shippedOnBoardOn: "2026-08-01",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      surcharge: "450000",
      surchargeExemption: "not-applied",
      totalPayable: "19184850",
    });
  });

  it("charges the surcharge when the shipped-on-board date falls after the order cutoff", () => {
    const result = vehicleImportDutyCalculator.calculate(
      {
        ...baseInput,
        lcEstablishedOn: "2026-05-10",
        shippedOnBoardOn: "2026-11-16",
      },
      vehicleImportPayloads,
    );

    expect(result.result).toMatchObject({
      surcharge: "450000",
      surchargeExemption: "not-applied",
    });
  });

  it("keeps the surcharge when no LC establishment date is entered", () => {
    const result = vehicleImportDutyCalculator.calculate(baseInput, vehicleImportPayloads);

    expect(result.result).toMatchObject({
      surcharge: "450000",
      surchargeExemption: "not-applied",
    });
  });

  it("offers no exemption when the payload defines no surcharge exemption", () => {
    const withoutExemption = {
      vehicleImport: {
        ...vehicleImportPayloads.vehicleImport,
        surchargeExemption: undefined,
      },
    };
    const result = vehicleImportDutyCalculator.calculate(
      {
        ...baseInput,
        lcEstablishedOn: "2026-05-01",
      },
      withoutExemption,
    );

    expect(result.result).toMatchObject({
      surcharge: "450000",
      surchargeExemption: "not-available",
    });
  });

  it("rejects a malformed LC establishment date", () => {
    expect(() => vehicleImportDutyCalculator.calculate(
      {
        ...baseInput,
        lcEstablishedOn: "2026/05/15",
      },
      vehicleImportPayloads,
    )).toThrow("Enter a valid LC establishment date.");
  });
});
