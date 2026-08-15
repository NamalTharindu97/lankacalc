import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import type { AuthenticatedSession } from "@/server/auth";
import { getSessionUser } from "@/server/auth";
import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import type { CalculationResult } from "@/domain/calculators/types";

type Database = PostgresJsDatabase<typeof schema>;

export type AccountApiResponse = {
  status: number;
  body: unknown;
};

const SUPPORTED_LOCALES = ["en", "si", "ta"] as const;

const supportedTimeZones = new Set(Intl.supportedValuesOf("timeZone"));

export const profileSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
  timezone: z.string().refine((value) => supportedTimeZones.has(value), {
    message: "The timezone must be a valid IANA time zone identifier.",
  }),
});

export const profileUpdateSchema = profileSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one profile field must be provided." },
);

const breakdownItemSchema = z.object({
  label: z.string().min(1),
  expression: z.string().optional(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
});

const sourceReferenceSchema = z.object({
  authority: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  publishedOn: z.string().nullable().optional(),
  retrievedAt: z.string().optional(),
  verifiedAt: z.string(),
});

const ruleReferenceSchema = z.object({
  key: z.string().min(1),
  version: z.string().min(1),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
});

const calculationResultSchema: z.ZodType<CalculationResult> = z.object({
  calculator: z.string().min(1),
  calculationVersion: z.string().min(1),
  asOfDate: z.string().nullable(),
  normalizedInputs: z.record(z.string(), z.union([z.string(), z.number()])),
  result: z.record(z.string(), z.union([z.string(), z.number()])),
  breakdown: z.array(breakdownItemSchema),
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()),
  ruleVersions: z.array(ruleReferenceSchema),
  sources: z.array(sourceReferenceSchema),
  verifiedAt: z.string().nullable(),
});

export const createSavedCalculationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  calculatorKey: z.string().min(1).max(80),
  input: z.record(z.string(), z.unknown()),
  result: calculationResultSchema,
});

export const renameSavedCalculationSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

function unauthorized(): AccountApiResponse {
  return {
    status: 401,
    body: {
      error: { code: "UNAUTHORIZED", message: "Sign in to access your saved calculations." },
    },
  };
}

function validationError(issues: z.ZodError["issues"]): AccountApiResponse {
  return {
    status: 422,
    body: {
      error: {
        code: "VALIDATION_ERROR",
        message: "The request body is invalid.",
        issues: issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    },
  };
}

function notFound(): AccountApiResponse {
  return {
    status: 404,
    body: {
      error: { code: "NOT_FOUND", message: "The saved calculation was not found." },
    },
  };
}

async function requireSession(headers: Headers): Promise<AuthenticatedSession | AccountApiResponse> {
  const session = await getSessionUser(headers);
  if (!session) return unauthorized();
  return session;
}

async function getOrCreateProfile(
  database: Database,
  userId: string,
): Promise<typeof schema.profiles.$inferSelect> {
  const existing = await database.query.profiles.findFirst({ where: eq(schema.profiles.userId, userId) });
  if (existing) return existing;
  return database.insert(schema.profiles)
    .values({ userId })
    .onConflictDoNothing()
    .returning()
    .then((rows) => rows[0] ?? database.query.profiles.findFirst({ where: eq(schema.profiles.userId, userId) }));
}

export async function getProfile(
  headers: Headers,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const profile = await getOrCreateProfile(database, session.user.id);
  return {
    status: 200,
    body: {
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      locale: profile.locale,
      timezone: profile.timezone,
    },
  };
}

export async function updateProfile(
  headers: Headers,
  rawBody: unknown,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const parsed = profileUpdateSchema.safeParse(rawBody);
  if (!parsed.success) return validationError(parsed.error.issues);

  const profile = await database.insert(schema.profiles)
    .values({ userId: session.user.id, ...parsed.data })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning()
    .then((rows) => rows[0]);

  return {
    status: 200,
    body: {
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      locale: profile.locale,
      timezone: profile.timezone,
    },
  };
}

function snapshotToJson(snapshot: typeof schema.calculationSnapshots.$inferSelect) {
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt.toISOString(),
    input: snapshot.input,
    result: snapshot.result,
  };
}

export async function listSavedCalculations(
  headers: Headers,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const rows = await database.query.savedCalculations.findMany({
    where: eq(schema.savedCalculations.userId, session.user.id),
    orderBy: desc(schema.savedCalculations.createdAt),
  });

  return {
    status: 200,
    body: rows.map((row) => ({
      id: row.id,
      name: row.name,
      calculatorKey: row.calculatorKey,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function createSavedCalculation(
  headers: Headers,
  rawBody: unknown,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const parsed = createSavedCalculationSchema.safeParse(rawBody);
  if (!parsed.success) return validationError(parsed.error.issues);

  const row = await database.transaction(async (transaction) => {
    const saved = await transaction.insert(schema.savedCalculations)
      .values({
        userId: session.user.id,
        name: parsed.data.name,
        calculatorKey: parsed.data.calculatorKey,
      })
      .returning()
      .then((rows) => rows[0]);

    const snapshot = await transaction.insert(schema.calculationSnapshots)
      .values({
        savedCalculationId: saved.id,
        input: parsed.data.input,
        result: parsed.data.result,
      })
      .returning()
      .then((rows) => rows[0]);

    return { saved, snapshot };
  });

  return {
    status: 201,
    body: {
      id: row.saved.id,
      name: row.saved.name,
      calculatorKey: row.saved.calculatorKey,
      createdAt: row.saved.createdAt.toISOString(),
      updatedAt: row.saved.updatedAt.toISOString(),
      snapshot: snapshotToJson(row.snapshot),
    },
  };
}

async function findOwnedSavedCalculation(
  database: Database,
  userId: string,
  id: string,
) {
  return database.query.savedCalculations.findFirst({
    where: and(
      eq(schema.savedCalculations.id, id),
      eq(schema.savedCalculations.userId, userId),
    ),
  });
}

export async function getSavedCalculation(
  headers: Headers,
  id: string,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const saved = await findOwnedSavedCalculation(database, session.user.id, id);
  if (!saved) return notFound();

  const snapshot = await database.query.calculationSnapshots.findFirst({
    where: eq(schema.calculationSnapshots.savedCalculationId, saved.id),
  });
  if (!snapshot) return notFound();

  return {
    status: 200,
    body: {
      id: saved.id,
      name: saved.name,
      calculatorKey: saved.calculatorKey,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
      snapshot: snapshotToJson(snapshot),
    },
  };
}

export async function renameSavedCalculation(
  headers: Headers,
  id: string,
  rawBody: unknown,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const parsed = renameSavedCalculationSchema.safeParse(rawBody);
  if (!parsed.success) return validationError(parsed.error.issues);

  const updated = await database.update(schema.savedCalculations)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(and(
      eq(schema.savedCalculations.id, id),
      eq(schema.savedCalculations.userId, session.user.id),
    ))
    .returning()
    .then((rows) => rows[0]);

  if (!updated) return notFound();

  return {
    status: 200,
    body: {
      id: updated.id,
      name: updated.name,
      calculatorKey: updated.calculatorKey,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  };
}

export async function deleteSavedCalculation(
  headers: Headers,
  id: string,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const deleted = await database.delete(schema.savedCalculations)
    .where(and(
      eq(schema.savedCalculations.id, id),
      eq(schema.savedCalculations.userId, session.user.id),
    ))
    .returning()
    .then((rows) => rows[0]);

  if (!deleted) return notFound();

  return { status: 204, body: null };
}

export async function exportSavedCalculation(
  headers: Headers,
  id: string,
  database: Database = getDatabase(),
): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const saved = await findOwnedSavedCalculation(database, session.user.id, id);
  if (!saved) return notFound();

  const snapshot = await database.query.calculationSnapshots.findFirst({
    where: eq(schema.calculationSnapshots.savedCalculationId, saved.id),
  });
  if (!snapshot) return notFound();

  return {
    status: 200,
    body: {
      exportVersion: "1",
      exportedAt: new Date().toISOString(),
      savedCalculation: {
        id: saved.id,
        name: saved.name,
        calculatorKey: saved.calculatorKey,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      },
      snapshot: snapshotToJson(snapshot),
    },
  };
}

export async function deleteAccount(headers: Headers): Promise<AccountApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as AccountApiResponse;

  const { auth } = await import("@/server/auth");
  await auth.api.deleteUser({ headers, body: {} });

  return { status: 204, body: null };
}
