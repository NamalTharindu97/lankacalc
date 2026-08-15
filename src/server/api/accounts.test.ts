import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createSavedCalculation,
  deleteAccount,
  deleteSavedCalculation,
  exportSavedCalculation,
  getProfile,
  getSavedCalculation,
  listSavedCalculations,
  renameSavedCalculation,
  updateProfile,
} from "@/server/api/accounts";
import { signUp, snapshotFixture } from "@/server/api/test-utils";
import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";

describe("account and saves API", () => {
  it("requires sign-in for profile and saved calculation access", async () => {
    const anonymous = new Headers();
    expect((await getProfile(anonymous)).status).toBe(401);
    expect((await listSavedCalculations(anonymous)).status).toBe(401);
    expect((await createSavedCalculation(anonymous, {})).status).toBe(401);
  });

  it("creates a profile with Sri Lankan defaults on first access", async () => {
    const headers = await signUp();
    const response = await getProfile(headers);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      locale: "en",
      timezone: "Asia/Colombo",
    });
  });

  it("updates locale and timezone while rejecting invalid values", async () => {
    const headers = await signUp();
    const updated = await updateProfile(headers, { locale: "si", timezone: "America/New_York" });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ locale: "si", timezone: "America/New_York" });

    expect((await updateProfile(headers, { timezone: "Not/AZone" })).status).toBe(422);
    expect((await updateProfile(headers, { locale: "fr" })).status).toBe(422);
    expect((await updateProfile(headers, {})).status).toBe(422);
  });

  it("saves a calculation snapshot preserving inputs, output, version, rules, sources, and assumptions", async () => {
    const headers = await signUp();
    const snapshot = snapshotFixture();
    snapshot.ruleVersions = [{
      key: "apit-primary-regular-monthly",
      version: "1",
      effectiveFrom: "2025-04-01",
      effectiveTo: null,
    }];
    snapshot.sources = [{
      authority: "IRD Sri Lanka",
      title: "Table 01",
      url: "https://www.ird.gov.lk/table-01",
      publishedOn: "2025-03-28",
      retrievedAt: "2026-08-01T00:00:00.000Z",
      verifiedAt: "2026-08-02T00:00:00.000Z",
    }];
    snapshot.verifiedAt = "2026-08-02T00:00:00.000Z";
    snapshot.assumptions = ["One primary employment", "One calendar month"];

    const response = await createSavedCalculation(headers, {
      name: "August APIT check",
      calculatorKey: "apit",
      input: { asOfDate: "2026-08-14", monthlyRegularEmploymentEarnings: "150000" },
      result: snapshot,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "August APIT check",
      calculatorKey: "apit",
      snapshot: {
        input: { asOfDate: "2026-08-14", monthlyRegularEmploymentEarnings: "150000" },
        result: snapshot,
      },
    });
  });

  it("rejects malformed saved calculation bodies", async () => {
    const headers = await signUp();
    expect((await createSavedCalculation(headers, { name: "", calculatorKey: "apit", input: {}, result: snapshotFixture() })).status).toBe(422);
    expect((await createSavedCalculation(headers, { name: "x", calculatorKey: "apit", input: {}, result: { ...snapshotFixture(), result: { nested: { too: "deep" } } } })).status).toBe(422);
  });

  it("lists only the owner's saved calculations", async () => {
    const alice = await signUp();
    const bob = await signUp();

    await createSavedCalculation(alice, {
      name: "Alice one", calculatorKey: "percentage", input: {}, result: snapshotFixture(),
    });
    await createSavedCalculation(alice, {
      name: "Alice two", calculatorKey: "percentage", input: {}, result: snapshotFixture(),
    });
    await createSavedCalculation(bob, {
      name: "Bob only", calculatorKey: "percentage", input: {}, result: snapshotFixture(),
    });

    const aliceList = await listSavedCalculations(alice);
    expect(aliceList.status).toBe(200);
    expect(aliceList.body).toHaveLength(2);
    const bobList = await listSavedCalculations(bob);
    expect(bobList.body).toHaveLength(1);
  });

  it("hides another user's saved calculation from read, rename, delete, and export", async () => {
    const alice = await signUp();
    const bob = await signUp();

    const created = await createSavedCalculation(alice, {
      name: "Private", calculatorKey: "percentage", input: {}, result: snapshotFixture(),
    });
    const id = (created.body as { id: string }).id;

    expect((await getSavedCalculation(bob, id)).status).toBe(404);
    expect((await renameSavedCalculation(bob, id, { name: "hijacked" })).status).toBe(404);
    expect((await deleteSavedCalculation(bob, id)).status).toBe(404);
    expect((await exportSavedCalculation(bob, id)).status).toBe(404);
    expect((await getSavedCalculation(alice, id)).status).toBe(200);
  });

  it("renames a saved calculation", async () => {
    const headers = await signUp();
    const created = await createSavedCalculation(headers, {
      name: "Original", calculatorKey: "percentage", input: {}, result: snapshotFixture(),
    });
    const id = (created.body as { id: string }).id;

    const renamed = await renameSavedCalculation(headers, id, { name: "Renamed" });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: "Renamed" });
    expect((await renameSavedCalculation(headers, id, { name: "" })).status).toBe(422);
  });

  it("deletes a saved calculation together with its snapshot", async () => {
    const headers = await signUp();
    const created = await createSavedCalculation(headers, {
      name: "Delete me", calculatorKey: "percentage", input: {}, result: snapshotFixture(),
    });
    const id = (created.body as { id: string }).id;

    expect((await deleteSavedCalculation(headers, id)).status).toBe(204);
    expect((await getSavedCalculation(headers, id)).status).toBe(404);
  });

  it("exports a saved calculation with the immutable snapshot", async () => {
    const headers = await signUp();
    const created = await createSavedCalculation(headers, {
      name: "Export me", calculatorKey: "percentage", input: { value: "250" }, result: snapshotFixture(),
    });
    const id = (created.body as { id: string }).id;

    const exported = await exportSavedCalculation(headers, id);
    expect(exported.status).toBe(200);
    expect(exported.body).toMatchObject({
      exportVersion: "1",
      savedCalculation: { name: "Export me", calculatorKey: "percentage" },
      snapshot: {
        input: { value: "250" },
        result: { calculator: "percentage", calculationVersion: "2.0.0" },
      },
    });
    expect(typeof (exported.body as { exportedAt?: string }).exportedAt).toBe("string");
  });

  it("deletes the account and removes personal records", async () => {
    const database = getDatabase();
    const headers = await signUp();
    const profile = await getProfile(headers);
    const userId = (profile.body as { userId: string }).userId;

    const created = await createSavedCalculation(headers, {
      name: "Account data", calculatorKey: "percentage", input: {}, result: snapshotFixture(),
    });
    const savedId = (created.body as { id: string }).id;

    expect((await deleteAccount(headers)).status).toBe(204);
    expect((await getProfile(headers)).status).toBe(401);

    expect(await database.query.users.findFirst({ where: eq(schema.users.id, userId) })).toBeUndefined();
    expect(await database.query.profiles.findFirst({ where: eq(schema.profiles.userId, userId) })).toBeUndefined();
    expect(await database.query.savedCalculations.findFirst({ where: eq(schema.savedCalculations.id, savedId) })).toBeUndefined();
  });
});
