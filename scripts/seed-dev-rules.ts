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
