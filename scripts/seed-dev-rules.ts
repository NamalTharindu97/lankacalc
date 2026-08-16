import "dotenv/config";

import { and, desc, eq } from "drizzle-orm";

import { closeDatabase, getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { getRulePlatform, ruleHandlers } from "@/server/rules/registry";
import type { JsonValue } from "@/server/rules/json";

const DEV_ACTOR = "local-smoke-test";
const SEED_REASON = "Provisioned by the dev rule seed script.";

type SourceInput = {
  key: string;
  authority: string;
  title: string;
  url: string;
  publishedOn?: string | null;
};

type FixtureInput = {
  name: string;
  input: JsonValue;
  expected: Array<[path: string, value: unknown]>;
};

type DevRuleInput = {
  key: string;
  calculatorKey: string;
  scope: string;
  name: string;
  description: string;
  version: string;
  effectiveFrom: string;
  payload: JsonValue;
  sources: SourceInput[];
  fixtures: FixtureInput[];
};

const electricityPayload = {
  provider: "ceb",
  standardBillingDays: 30,
  domesticCategories: [
    {
      maxUnits: 60,
      blocks: [
        { minUnits: 0, maxUnits: 30, energyRatePerKwh: "5", fixedCharge: "80" },
        { minUnits: 30, maxUnits: 60, energyRatePerKwh: "9", fixedCharge: "210" },
      ],
    },
    {
      maxUnits: 180,
      blocks: [
        { minUnits: 0, maxUnits: 60, energyRatePerKwh: "14", fixedCharge: "0" },
        { minUnits: 60, maxUnits: 90, energyRatePerKwh: "20", fixedCharge: "400" },
        { minUnits: 90, maxUnits: 120, energyRatePerKwh: "28", fixedCharge: "1000" },
        { minUnits: 120, maxUnits: 180, energyRatePerKwh: "44", fixedCharge: "1500" },
      ],
    },
    {
      maxUnits: null,
      blocks: [
        { minUnits: 0, maxUnits: 180, energyRatePerKwh: "32.5", fixedCharge: "0" },
        { minUnits: 180, maxUnits: null, energyRatePerKwh: "100", fixedCharge: "2500" },
      ],
    },
  ],
  sscLPercent: "2.5",
  rounding: "half-up-cent",
} as const;

const electricityNonDomesticPayload = {
  provider: "ceb",
  standardBillingDays: 30,
  sscLPercent: "2.5",
  rounding: "half-up-cent",
  categories: {
    religious: {
      structure: "block",
      categories: [
        {
          maxUnits: 180,
          blocks: [
            { minUnits: 0, maxUnits: 30, energyRatePerKwh: "4.5", fixedCharge: "75" },
            { minUnits: 30, maxUnits: 90, energyRatePerKwh: "4.5", fixedCharge: "200" },
            { minUnits: 90, maxUnits: 120, energyRatePerKwh: "8", fixedCharge: "350" },
            { minUnits: 120, maxUnits: 180, energyRatePerKwh: "19", fixedCharge: "1300" },
          ],
        },
        {
          maxUnits: null,
          blocks: [
            { minUnits: 0, maxUnits: 180, energyRatePerKwh: "11.8", fixedCharge: "0" },
            { minUnits: 180, maxUnits: null, energyRatePerKwh: "35", fixedCharge: "2000" },
          ],
        },
      ],
    },
    "gp-1": {
      structure: "v-dmc",
      thresholdUnits: 180,
      lowTier: { energyRatePerKwh: "27", fixedCharge: "500" },
      highTier: { energyRatePerKwh: "36", fixedCharge: "1600" },
    },
    "ip-1": {
      structure: "v-dmc",
      thresholdUnits: 300,
      lowTier: { energyRatePerKwh: "9", fixedCharge: "300" },
      highTier: { energyRatePerKwh: "18", fixedCharge: "800" },
    },
    "h-1": {
      structure: "v-dmc",
      thresholdUnits: 300,
      lowTier: { energyRatePerKwh: "9", fixedCharge: "300" },
      highTier: { energyRatePerKwh: "18", fixedCharge: "800" },
    },
    "gv-1": {
      structure: "v-dmc",
      thresholdUnits: 180,
      lowTier: { energyRatePerKwh: "34.5", fixedCharge: "600" },
      highTier: { energyRatePerKwh: "45", fixedCharge: "1900" },
    },
    "gp-2": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "49",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1800",
    },
    "ip-2": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1650",
    },
    "h-2": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1650",
    },
    "gv-2": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "53",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1800",
    },
    "gp-3": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "49",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1700",
    },
    "ip-3": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1600",
    },
    "h-3": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1600",
    },
    "gv-3": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "53",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1700",
    },
    "street-lighting": {
      structure: "single-rate",
      energyRatePerKwh: "60",
      fixedCharge: "0",
    },
    "agriculture-tou": {
      structure: "tou",
      peakRatePerKwh: "28",
      dayRatePerKwh: "14",
      offPeakRatePerKwh: "8",
      fixedCharge: "750",
      demandChargePerKva: null,
    },
    "evcs-1": {
      structure: "tou",
      peakRatePerKwh: "70",
      dayRatePerKwh: "15",
      offPeakRatePerKwh: "31",
      fixedCharge: "1600",
      demandChargePerKva: null,
    },
    "evcs-2": {
      structure: "tou",
      peakRatePerKwh: "70",
      dayRatePerKwh: "15",
      offPeakRatePerKwh: "31",
      fixedCharge: "5000",
      demandChargePerKva: "1500",
    },
  },
} as const;

const ssclCheckPayload = {
  authority: "sscl-act-2022-as-amended",
  effectiveFrom: "2024-01-01",
  rounding: "nearest-rupee",
  ratePercent: "2.5",
  liableFractions: {
    importer: "100",
    manufacturer: "85",
    "service-provider": "100",
    "financial-service": "100",
    "land-improvement": "100",
    "wholesale-retail-distributor": "25",
    "wholesale-retail-other": "50",
  },
  registrationThresholds: [
    { effectiveFrom: "2024-01-01", quarter: "15000000", annual: "60000000" },
    { effectiveFrom: "2026-07-01", quarter: "9000000", annual: "36000000" },
  ],
  financialServicesExemptFrom: "2025-12-17",
} as const;

const vehicleImportPayload = {
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
} as const;

const observedLendingRatesPayload = {
  authority: "cbsl",
  effectiveFrom: "2026-01-01",
  rounding: "two-decimal-percent",
  rates: [
    {
      rateType: "awpr",
      label: "Average Weighted Prime Lending Rate (monthly)",
      value: "8.99",
      observedOn: "2026-01-31",
    },
    {
      rateType: "awpr",
      label: "Average Weighted Prime Lending Rate (monthly)",
      value: "9.39",
      observedOn: "2026-03-31",
    },
    {
      rateType: "awpr",
      label: "Average Weighted Prime Lending Rate (monthly)",
      value: "9.75",
      observedOn: "2026-05-31",
    },
  ],
} as const;

const vehicleLeaseLtvPayload = {
  authority: "cbsl",
  effectiveFrom: "2025-07-18",
  rounding: "two-decimal-percent",
  rates: [
    {
      rateType: "max-motor-vehicle-ltv",
      category: "motor-car",
      label: "Motor cars, SUVs and vans (DMT class B, other than light trucks and single cabs)",
      value: "60",
      observedOn: "2025-07-18",
    },
    {
      rateType: "max-motor-vehicle-ltv",
      category: "three-wheeler",
      label: "Three wheelers (DMT class B1)",
      value: "50",
      observedOn: "2025-07-18",
    },
    {
      rateType: "max-motor-vehicle-ltv",
      category: "commercial",
      label: "Commercial vehicles and light trucks (DMT classes C1, C, CE, D1, D, DE, G1, G, J)",
      value: "80",
      observedOn: "2025-07-18",
    },
    {
      rateType: "max-motor-vehicle-ltv",
      category: "other",
      label: "Other vehicles (DMT classes A1, A and single cabs under B)",
      value: "70",
      observedOn: "2025-07-18",
    },
    {
      rateType: "max-motor-vehicle-ltv",
      category: "used",
      label: "Registered vehicles used in Sri Lanka for more than one year after first registration",
      value: "70",
      observedOn: "2025-07-18",
    },
  ],
} as const;

const devRules: DevRuleInput[] = [
  {
    key: "electricity-domestic-standard",
    calculatorKey: "electricity-bill",
    scope: "standard",
    name: "CEB standard domestic electricity tariff",
    description: "CEB standard domestic tariff effective 2026-05-11 (candidate spec values).",
    version: "1.0.0",
    effectiveFrom: "2026-05-11",
    payload: electricityPayload as unknown as JsonValue,
    sources: [
      {
        key: "electricity-pucsl-tariff-2026-05-11",
        authority: "Public Utilities Commission of Sri Lanka",
        title: "PUCSL electricity tariff revision effective 11 May 2026",
        url: "https://www.pucsl.gov.lk/electricity-tariff-revision-2026-may/",
        publishedOn: "2026-05-09",
      },
      {
        key: "electricity-ceb-rates-tariffs",
        authority: "Ceylon Electricity Board",
        title: "CEB rates and tariffs",
        url: "https://ceb.lk/rates-and-tariffs/en",
      },
    ],
    fixtures: [
      {
        name: "zero units minimum charge",
        input: { unitsConsumed: 0, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["fixedCharge", "80.00"],
          ["totalPayable", "82.00"],
        ],
      },
      {
        name: "low consumption across both blocks",
        input: { unitsConsumed: 40, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["category", "0-60"],
          ["totalPayable", "461.25"],
        ],
      },
      {
        name: "second fixed tier at the 60-unit boundary",
        input: { unitsConsumed: 60, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["energyCharge", "420.00"],
          ["totalPayable", "645.75"],
        ],
      },
      {
        name: "moves into the 61-180 category",
        input: { unitsConsumed: 61, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["category", "61-180"],
          ["sscLAmount", "31.50"],
        ],
      },
      {
        name: "mid-range domestic consumption",
        input: { unitsConsumed: 100, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["category", "61-180"],
          ["totalPayable", "2788.00"],
        ],
      },
      {
        name: "open-ended high consumption",
        input: { unitsConsumed: 210, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["category", "above 180"],
          ["totalPayable", "11633.75"],
        ],
      },
      {
        name: "billing-period proration",
        input: { unitsConsumed: 62, billingDays: 31 } as unknown as JsonValue,
        expected: [
          ["category", "0-60"],
          ["totalPayable", "660.10"],
        ],
      },
    ],
  },
  {
    key: "electricity-non-domestic-standard",
    calculatorKey: "electricity-non-domestic-bill",
    scope: "standard",
    name: "CEB standard non-domestic electricity tariffs",
    description: "CEB non-domestic tariffs effective 2026-05-11 (religious, general purpose, government, industrial, hotel, street lighting, agriculture, and EV charging).",
    version: "1.0.0",
    effectiveFrom: "2026-05-11",
    payload: electricityNonDomesticPayload as unknown as JsonValue,
    sources: [
      {
        key: "electricity-pucsl-tariff-2026-05-11",
        authority: "Public Utilities Commission of Sri Lanka",
        title: "PUCSL electricity tariff revision effective 11 May 2026",
        url: "https://www.pucsl.gov.lk/electricity-tariff-revision-2026-may/",
        publishedOn: "2026-05-09",
      },
      {
        key: "electricity-pucsl-tariff-table-approved-2026-05-11",
        authority: "Public Utilities Commission of Sri Lanka",
        title: "Tariff Table - Approved (Annex-2 transcription), effective from 11 May 2026",
        url: "https://www.scribd.com/document/1036840384/Tariff-Table-Approved",
        publishedOn: "2026-05-11",
      },
    ],
    fixtures: [
      {
        name: "religious restructured above 180 category",
        input: { category: "religious", unitsConsumed: 200, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["category", "Religious & charitable"],
          ["tier", "above 180"],
          ["energyCharge", "2824.00"],
          ["fixedCharge", "2000.00"],
          ["totalPayable", "4944.60"],
        ],
      },
      {
        name: "religious within the 0-180 blocks",
        input: { category: "religious", unitsConsumed: 150, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["tier", "0-180"],
          ["energyCharge", "1215.00"],
          ["fixedCharge", "1300.00"],
          ["totalPayable", "2577.88"],
        ],
      },
      {
        name: "gp-1 volume-differentiated low tier",
        input: { category: "gp-1", unitsConsumed: 180, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["tier", "Tier 1 (≤ 180 kWh/month)"],
          ["energyCharge", "4860.00"],
          ["fixedCharge", "500.00"],
          ["totalPayable", "5494.00"],
        ],
      },
      {
        name: "gp-1 volume-differentiated high tier",
        input: { category: "gp-1", unitsConsumed: 181, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["tier", "Tier 2 (> 180 kWh/month)"],
          ["energyCharge", "6516.00"],
          ["fixedCharge", "1600.00"],
          ["totalPayable", "8318.90"],
        ],
      },
      {
        name: "gv-1 government increased tier",
        input: { category: "gv-1", unitsConsumed: 200, billingDays: 30 } as unknown as JsonValue,
        expected: [
          ["tier", "Tier 2 (> 180 kWh/month)"],
          ["energyCharge", "9000.00"],
          ["fixedCharge", "1900.00"],
          ["totalPayable", "11172.50"],
        ],
      },
      {
        name: "gp-2 time-of-use with demand charge",
        input: { category: "gp-2", dayUnits: 800, peakUnits: 400, offPeakUnits: 300, billedDemandKva: 50 } as unknown as JsonValue,
        expected: [
          ["structure", "tou"],
          ["energyCharge", "81700.00"],
          ["demandCharge", "90000.00"],
          ["fixedCharge", "6000.00"],
          ["totalPayable", "182142.50"],
        ],
      },
      {
        name: "ip-3 11kV time-of-use with demand charge",
        input: { category: "ip-3", dayUnits: 1000, peakUnits: 500, offPeakUnits: 500, billedDemandKva: 100 } as unknown as JsonValue,
        expected: [
          ["structure", "tou"],
          ["energyCharge", "44750.00"],
          ["demandCharge", "160000.00"],
          ["fixedCharge", "6000.00"],
          ["totalPayable", "216018.75"],
        ],
      },
      {
        name: "street lighting single rate",
        input: { category: "street-lighting", unitsConsumed: 500 } as unknown as JsonValue,
        expected: [
          ["structure", "single-rate"],
          ["energyCharge", "30000.00"],
          ["fixedCharge", "0.00"],
          ["totalPayable", "30750.00"],
        ],
      },
      {
        name: "agriculture optional time-of-use",
        input: { category: "agriculture-tou", dayUnits: 1000, peakUnits: 200, offPeakUnits: 500 } as unknown as JsonValue,
        expected: [
          ["structure", "tou"],
          ["energyCharge", "23600.00"],
          ["fixedCharge", "750.00"],
          ["demandCharge", "0.00"],
          ["totalPayable", "24958.75"],
        ],
      },
      {
        name: "evcs-1 off-peak at the approved rate",
        input: { category: "evcs-1", dayUnits: 100, peakUnits: 50, offPeakUnits: 200 } as unknown as JsonValue,
        expected: [
          ["structure", "tou"],
          ["energyCharge", "11200.00"],
          ["fixedCharge", "1600.00"],
          ["totalPayable", "13120.00"],
        ],
      },
      {
        name: "evcs-2 with demand charge",
        input: { category: "evcs-2", dayUnits: 100, peakUnits: 50, offPeakUnits: 200, billedDemandKva: 30 } as unknown as JsonValue,
        expected: [
          ["structure", "tou"],
          ["energyCharge", "11200.00"],
          ["demandCharge", "45000.00"],
          ["fixedCharge", "5000.00"],
          ["totalPayable", "62730.00"],
        ],
      },
    ],
  },
  {
    key: "sscl-lk-2026",
    calculatorKey: "sscl-check",
    scope: "lk",
    name: "Sri Lanka SSCL rates and registration thresholds",
    description: "SSCL 2.5% rate, liable fractions, registration thresholds, and financial-services exemption.",
    version: "1.0.0",
    effectiveFrom: "2024-01-01",
    payload: ssclCheckPayload as unknown as JsonValue,
    sources: [
      {
        key: "sscl-act-2022",
        authority: "Inland Revenue Department Sri Lanka",
        title: "Social Security Contribution Levy Act, No. 25 of 2022",
        url: "https://www.ird.gov.lk/en/publications/Social%20Security%20Contribution%20Levy/Social%20Security%20Contribution%20Levy%20Act%20No.%2025%20of%202022.pdf",
      },
      {
        key: "ird-sscl-overview",
        authority: "Inland Revenue Department Sri Lanka",
        title: "IRD SSCL overview",
        url: "https://www.ird.gov.lk/en/type%20of%20taxes/sitepages/social%20security%20contribution%20levy.aspx",
      },
    ],
    fixtures: [
      {
        name: "manufacturer quarter threshold",
        input: {
          asOfDate: "2026-08-16",
          turnoverCategory: "manufacturer",
          periodEndDate: "2026-06-30",
          quarterlyTurnover: 20000000,
        } as unknown as JsonValue,
        expected: [
          ["registrationStatus", "required"],
          ["ssclPayable", "425000.00"],
        ],
      },
      {
        name: "manufacturer below thresholds",
        input: {
          asOfDate: "2026-08-16",
          turnoverCategory: "manufacturer",
          periodEndDate: "2026-06-30",
          quarterlyTurnover: 10000000,
          rollingFourQuarterTurnover: 50000000,
        } as unknown as JsonValue,
        expected: [
          ["registrationStatus", "not-required"],
          ["ssclPayable", "0.00"],
        ],
      },
      {
        name: "importer mandatory registration",
        input: {
          asOfDate: "2026-08-16",
          turnoverCategory: "importer",
          periodEndDate: "2026-06-30",
          quarterlyTurnover: 4000000,
        } as unknown as JsonValue,
        expected: [
          ["registrationStatus", "mandatory"],
          ["ssclPayable", "100000.00"],
        ],
      },
      {
        name: "annual threshold trigger",
        input: {
          asOfDate: "2026-08-16",
          turnoverCategory: "wholesale-retail-distributor",
          periodEndDate: "2026-09-30",
          quarterlyTurnover: 8000000,
          rollingFourQuarterTurnover: 40000000,
        } as unknown as JsonValue,
        expected: [
          ["registrationStatus", "required"],
          ["ssclPayable", "50000.00"],
        ],
      },
      {
        name: "financial services exempt",
        input: {
          asOfDate: "2026-08-16",
          turnoverCategory: "financial-service",
          periodEndDate: "2026-06-30",
          quarterlyTurnover: 100000000,
        } as unknown as JsonValue,
        expected: [
          ["exemptionApplied", true],
          ["ssclPayable", "0.00"],
        ],
      },
      {
        name: "rounding to the nearest rupee",
        input: {
          asOfDate: "2026-08-16",
          turnoverCategory: "importer",
          periodEndDate: "2026-06-30",
          quarterlyTurnover: 1000020,
        } as unknown as JsonValue,
        expected: [
          ["ssclPayable", "25001.00"],
        ],
      },
    ],
  },
  {
    key: "vehicle-import-excise-nitg-2026",
    calculatorKey: "vehicle-import-duty",
    scope: "lk",
    name: "Vehicle import excise and duty under NITG 2026",
    description: "NITG 2026 excise schedules, 1.10 CIF base for VAT, 2026-08-15 S.P.D. surcharge order with the 2026-05-15 LC cut-off exemption, and luxury-tax surcharge gazettes.",
    version: "1.0.0",
    effectiveFrom: "2026-04-01",
    payload: vehicleImportPayload as unknown as JsonValue,
    sources: [
      {
        key: "nitg-2026-index",
        authority: "Sri Lanka Customs",
        title: "Sri Lanka Customs NITG main index",
        url: "https://www.customs.gov.lk/",
      },
      {
        key: "nitg-2026-preamble",
        authority: "Sri Lanka Customs",
        title: "Preamble to the NITG 2026",
        url: "https://www.customs.gov.lk/wp-content/uploads/2026/06/Preamble%20intergrated.pdf",
      },
      {
        key: "nitg-2026-chapter-87",
        authority: "Sri Lanka Customs",
        title: "NITG 2026 Chapter 87 motor-vehicle excise schedules",
        url: "https://www.customs.gov.lk/",
      },
      {
        key: "luxury-tax-gazette-2421-41",
        authority: "Department of Government Printing",
        title: "Gazette Extraordinary No. 2421/41 (luxury tax on motor vehicles)",
        url: "https://www.documents.gov.lk/",
      },
      {
        key: "spd-surcharge-order-2488-56",
        authority: "Department of Government Printing",
        title: "Gazette Extraordinary No. 2488/56 (temporary S.P.D. surcharge order)",
        url: "https://www.documents.gov.lk/",
      },
      {
        key: "cid-rate-order-2478-03",
        authority: "Department of Government Printing",
        title: "Gazette Extraordinary No. 2478/03 (April 2026 CID rate order)",
        url: "https://www.documents.gov.lk/",
      },
    ],
    fixtures: [
      {
        name: "petrol 1800cc within luxury threshold",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "petrol",
          cifValue: "3000000",
          engineCc: 1800,
          vehicleAge: "not-more-than-one-year",
        } as unknown as JsonValue,
        expected: [
          ["excise", "11520000"],
          ["vat", "2910600"],
          ["sscl", "404250"],
          ["totalPayable", "19184850"],
        ],
      },
      {
        name: "petrol 1000cc per-unit rate",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "petrol",
          cifValue: "2000000",
          engineCc: 1000,
          vehicleAge: "not-more-than-one-year",
        } as unknown as JsonValue,
        expected: [
          ["excise", "2450000"],
          ["totalPayable", "6487750"],
        ],
      },
      {
        name: "petrol 2000cc luxury surcharge",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "petrol",
          cifValue: "6000000",
          engineCc: 2000,
          vehicleAge: "not-more-than-one-year",
        } as unknown as JsonValue,
        expected: [
          ["excise", "15400000"],
          ["luxuryTax", "1000000"],
          ["totalPayable", "30163500"],
        ],
      },
      {
        name: "diesel-hybrid 2000cc",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "diesel-hybrid",
          cifValue: "4000000",
          engineCc: 2000,
          vehicleAge: "one-to-three-years",
        } as unknown as JsonValue,
        expected: [
          ["excise", "16700000"],
          ["totalPayable", "27194500"],
        ],
      },
      {
        name: "electric 120kW age-sensitive rate",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "electric",
          cifValue: "8000000",
          motorKw: 120,
          vehicleAge: "not-more-than-one-year",
        } as unknown as JsonValue,
        expected: [
          ["excise", "4344000"],
          ["luxuryTax", "1200000"],
          ["totalPayable", "20576520"],
        ],
      },
      {
        name: "electric 40kW first band",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "electric",
          cifValue: "3000000",
          motorKw: 40,
          vehicleAge: "one-to-three-years",
        } as unknown as JsonValue,
        expected: [
          ["excise", "1448000"],
          ["totalPayable", "7048090"],
        ],
      },
      {
        name: "LC before 2026-05-15 cut-off exempt from surcharge",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "petrol",
          cifValue: "3000000",
          engineCc: 1800,
          vehicleAge: "not-more-than-one-year",
          lcEstablishedOn: "2026-05-15",
          shippedOnBoardOn: "2026-08-01",
        } as unknown as JsonValue,
        expected: [
          ["surcharge", "0"],
          ["surchargeExemption", "applied"],
          ["totalPayable", "18642600"],
        ],
      },
      {
        name: "LC after cut-off pays the surcharge",
        input: {
          asOfDate: "2026-08-16",
          vehicleType: "petrol",
          cifValue: "3000000",
          engineCc: 1800,
          vehicleAge: "not-more-than-one-year",
          lcEstablishedOn: "2026-05-16",
          shippedOnBoardOn: "2026-08-01",
        } as unknown as JsonValue,
        expected: [
          ["surcharge", "450000"],
          ["surchargeExemption", "not-applied"],
        ],
      },
    ],
  },
  {
    key: "observed-lending-rates-lk-2026",
    calculatorKey: "loan-schedule",
    scope: "lk",
    name: "CBSL observed lending rates",
    description: "Platform-observed CBSL monthly AWPR observations with source and date for the loan-schedule calculator.",
    version: "1.0.0",
    effectiveFrom: "2026-01-01",
    payload: observedLendingRatesPayload as unknown as JsonValue,
    sources: [
      {
        key: "cbsl-monetary-interest-rate-statistics",
        authority: "Central Bank of Sri Lanka",
        title: "CBSL monetary and interest rate statistics",
        url: "https://www.cbsl.gov.lk/en/economic-and-statistical-charts/monetary-and-interest-rate-statistics",
      },
      {
        key: "cbsl-may-2026-bulletin",
        authority: "Central Bank of Sri Lanka",
        title: "Monthly Bulletin of Monetary and Interest Rate Statistics - 2026 May",
        url: "https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/statistics/monthly_bulletin_monetary_and_interest_rate_statistics_may_2026.pdf",
      },
      {
        key: "cbsl-january-2026-bulletin",
        authority: "Central Bank of Sri Lanka",
        title: "Monthly Bulletin of Monetary and Interest Rate Statistics - 2026 January",
        url: "https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/statistics/monthly_bulletin_monetary_and_interest_rate_statistics_january_2026.pdf",
      },
    ],
    fixtures: [
      {
        name: "resolves the latest AWPR on or before the date",
        input: {
          asOfDate: "2026-08-16",
        } as unknown as JsonValue,
        expected: [
          ["rateType", "awpr"],
          ["value", "9.75"],
          ["observedOn", "2026-05-31"],
        ],
      },
      {
        name: "resolves the observation window before a later bulletin",
        input: {
          asOfDate: "2026-04-15",
        } as unknown as JsonValue,
        expected: [
          ["rateType", "awpr"],
          ["value", "9.39"],
          ["observedOn", "2026-03-31"],
        ],
      },
      {
        name: "earliest observation for a pre-May date",
        input: {
          asOfDate: "2026-02-15",
        } as unknown as JsonValue,
        expected: [
          ["rateType", "awpr"],
          ["value", "8.99"],
          ["observedOn", "2026-01-31"],
        ],
      },
    ],
  },
  {
    key: "vehicle-lease-ltv-lk-2026",
    calculatorKey: "lease",
    scope: "lk",
    name: "CBSL motor-vehicle loan-to-value caps",
    description: "CBSL Act Directions No. 02 of 2025 maximum loan-to-value ratios for motor-vehicle finance leases and credit, effective 2025-07-18.",
    version: "1.0.0",
    effectiveFrom: "2025-07-18",
    payload: vehicleLeaseLtvPayload as unknown as JsonValue,
    sources: [
      {
        key: "cbsl-act-directions-02-2025",
        authority: "Central Bank of Sri Lanka",
        title: "CBSL Act Directions No. 02 of 2025: Loan to Value Ratios for Credit Facilities Granted in Respect of Motor Vehicles",
        url: "https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/CBSL_Act_Directions_No_2_of_2025.pdf",
        publishedOn: "2025-07-17",
      },
      {
        key: "cbsl-ltv-faq-2025",
        authority: "Central Bank of Sri Lanka",
        title: "Frequently Asked Questions on Central Bank Act Directions on LTV Ratios for Credit Facilities Granted in Respect of Motor Vehicles",
        url: "https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/faq_on_loan_to_value_ratios_for_credit_facilities_granted_in_respect_of_motor_vehicles_e.pdf",
      },
    ],
    fixtures: [
      {
        name: "motor car cap",
        input: {
          asOfDate: "2026-08-16",
          vehicleClass: "motor-car",
          vehicleUsedMoreThanOneYear: "no",
        } as unknown as JsonValue,
        expected: [
          ["rateType", "max-motor-vehicle-ltv"],
          ["category", "motor-car"],
          ["value", "60"],
          ["observedOn", "2025-07-18"],
        ],
      },
      {
        name: "three-wheeler cap",
        input: {
          asOfDate: "2026-08-16",
          vehicleClass: "three-wheeler",
          vehicleUsedMoreThanOneYear: "no",
        } as unknown as JsonValue,
        expected: [
          ["value", "50"],
          ["category", "three-wheeler"],
        ],
      },
      {
        name: "commercial vehicle cap",
        input: {
          asOfDate: "2026-08-16",
          vehicleClass: "commercial",
          vehicleUsedMoreThanOneYear: "no",
        } as unknown as JsonValue,
        expected: [
          ["value", "80"],
          ["category", "commercial"],
        ],
      },
      {
        name: "other vehicle cap",
        input: {
          asOfDate: "2026-08-16",
          vehicleClass: "other",
          vehicleUsedMoreThanOneYear: "no",
        } as unknown as JsonValue,
        expected: [
          ["value", "70"],
          ["category", "other"],
        ],
      },
      {
        name: "used for more than one year flat cap",
        input: {
          asOfDate: "2026-08-16",
          vehicleClass: "motor-car",
          vehicleUsedMoreThanOneYear: "yes",
        } as unknown as JsonValue,
        expected: [
          ["value", "70"],
          ["category", "used"],
        ],
      },
    ],
  },
];

function lookupPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current !== null && typeof current === "object") {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, value);
}

async function provisionSource(database: ReturnType<typeof getDatabase>, source: SourceInput, checkedAt: Date, verifiedAt: Date) {
  const [existing] = await database.select().from(schema.sources)
    .where(eq(schema.sources.key, source.key)).limit(1);
  if (existing) {
    return existing;
  }

  const [createdSource] = await database.insert(schema.sources).values({
    key: source.key,
    authority: source.authority,
    title: source.title,
    url: source.url,
    official: true,
    publishedOn: source.publishedOn ?? null,
    verifiedAt,
  }).returning();

  const [revision] = await database.insert(schema.sourceRevisions).values({
    sourceId: createdSource.id,
    revision: 1,
    authority: source.authority,
    title: source.title,
    url: source.url,
    official: true,
    publishedOn: source.publishedOn ?? null,
    retrievedAt: verifiedAt,
    changeNote: "Initial revision provisioned by the dev rule seed script.",
    createdBy: DEV_ACTOR,
  }).returning();

  await database.insert(schema.verificationEvents).values({
    sourceId: createdSource.id,
    sourceRevisionId: revision.id,
    outcome: "verified",
    verifier: DEV_ACTOR,
    reason: "Link and content verification for the dev seed.",
    verifiedAt,
  });

  await database.insert(schema.sourceLinkChecks).values({
    sourceId: createdSource.id,
    sourceRevisionId: revision.id,
    status: "healthy",
    httpStatus: 200,
    checkedAt,
  });

  return createdSource;
}

async function provisionRule(rule: DevRuleInput): Promise<void> {
  const database = getDatabase();
  const platform = getRulePlatform();

  const handler = ruleHandlers[rule.key];
  if (!handler) {
    throw new Error(`No rule handler is registered for '${rule.key}'.`);
  }

  const [existingDefinition] = await database.select().from(schema.ruleDefinitions)
    .where(and(
      eq(schema.ruleDefinitions.key, rule.key),
      eq(schema.ruleDefinitions.scope, rule.scope),
    )).limit(1);

  let definition = existingDefinition;
  if (definition) {
    const [latest] = await database.select().from(schema.ruleVersions)
      .where(eq(schema.ruleVersions.ruleDefinitionId, definition.id))
      .orderBy(desc(schema.ruleVersions.createdAt)).limit(1);
    if (latest && latest.status !== "draft" && latest.status !== "reviewed") {
      console.log(`SKIP ${rule.key}:${rule.scope} is already provisioned (${latest.status}).`);
      return;
    }
  } else {
    definition = await platform.createDefinition({
      key: rule.key,
      calculatorKey: rule.calculatorKey,
      scope: rule.scope,
      name: rule.name,
      description: rule.description,
    }, DEV_ACTOR);
  }

  const [latestVersion] = await database.select().from(schema.ruleVersions)
    .where(eq(schema.ruleVersions.ruleDefinitionId, definition.id))
    .orderBy(desc(schema.ruleVersions.createdAt)).limit(1);
  let version =
    latestVersion && (latestVersion.status === "draft" || latestVersion.status === "reviewed")
      ? latestVersion
      : undefined;
  if (!version) {
    version = await platform.createDraft({
      ruleDefinitionId: definition.id,
      version: rule.version,
      effectiveFrom: rule.effectiveFrom,
      payload: rule.payload,
      payloadSchemaVersion: "1",
    }, DEV_ACTOR);
  }

  const base = Date.now();
  let index = 0;
  for (const source of rule.sources) {
    const checkedAt = new Date(base + index * 1000);
    const verifiedAt = new Date(base + index * 1000 + 500);
    const createdSource = await provisionSource(database, source, checkedAt, verifiedAt);
    await platform.attachSource(version.id, createdSource.id, `Dev seed source: ${source.title}`);
    index += 1;
  }

  const existingFixtures = await database.select()
    .from(schema.ruleValidationFixtures)
    .where(eq(schema.ruleValidationFixtures.ruleVersionId, version.id));
  const existingNames = new Set(existingFixtures.map((fixture) => fixture.name));

  for (const fixture of rule.fixtures) {
    if (existingNames.has(fixture.name)) {
      continue;
    }
    const expectedResult = handler.calculate(fixture.input, rule.payload);
    for (const [path, expected] of fixture.expected) {
      const actual = lookupPath(expectedResult as Record<string, unknown>, path);
      if (actual !== expected) {
        throw new Error(`Golden assertion failed for '${rule.key}' fixture '${fixture.name}' at ${path}: expected ${String(expected)}, got ${String(actual)}.`);
      }
    }
    await platform.addFixture(version.id, {
      name: fixture.name,
      input: fixture.input,
      expectedResult,
    });
  }

  if (version.status === "draft") {
    const fixtureResults = await platform.runFixtures(version.id);
    const failed = fixtureResults.filter((fixture) => !fixture.passed);
    if (failed.length > 0) {
      throw new Error(`Fixtures failed for '${rule.key}': ${failed.map((fixture) => fixture.name).join(", ")}.`);
    }
    await platform.review(version.id, DEV_ACTOR, SEED_REASON);
  }

  const published = await platform.publish(version.id, DEV_ACTOR, SEED_REASON);
  console.log(`OK ${rule.key}:${rule.scope} provisioned as version ${published.version} (${published.status}).`);
}

async function main(): Promise<void> {
  for (const rule of devRules) {
    await provisionRule(rule);
  }
  await closeDatabase();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closeDatabase();
  process.exitCode = 1;
});
