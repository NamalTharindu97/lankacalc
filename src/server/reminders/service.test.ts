import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getSessionUser } from "@/server/auth";
import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import type { EmailMessage, EmailProvider, EmailSendResult } from "@/server/email/provider";
import {
  buildUnsubscribeUrl,
  createReminder,
  deleteReminder,
  getPreferences,
  getReminder,
  listReminders,
  processDueDeliveries,
  unsubscribeByToken,
  updatePreferences,
  updateReminder,
} from "@/server/reminders/service";
import { signUp } from "@/server/api/test-utils";

const database = getDatabase();

class FakeEmailProvider implements EmailProvider {
  readonly name = "fake";
  sent: EmailMessage[] = [];
  private failures: Array<{ transient: boolean; detail: string }> = [];

  queueFailure(transient: boolean, detail = "fake failure") {
    this.failures.push({ transient, detail });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const failure = this.failures.shift();
    if (failure) return { ok: false, transient: failure.transient, detail: failure.detail };
    this.sent.push(message);
    return { ok: true, detail: "fake delivery" };
  }
}

async function userIdFrom(headers: Headers): Promise<string> {
  const session = await getSessionUser(headers);
  if (!session) throw new Error("Expected a session.");
  return session.user.id;
}

async function createDueTomorrowReminder(
  headers: Headers,
  offsets: number[] = [1],
): Promise<{ reminderId: string; deliveryCount: number }> {
  const created = await createReminder(headers, {
    title: "Passport renewal",
    obligationDate: "2026-10-01",
    note: "Carry two photos.",
    actionUrl: "https://example.com/passport",
    offsets,
  });
  const reminder = (created.body as { reminder: { id: string } }).reminder;
  return { reminderId: reminder.id, deliveryCount: offsets.length };
}

async function deliveriesFor(reminderId: string) {
  return database.query.scheduledDeliveries.findMany({
    where: eq(schema.scheduledDeliveries.reminderId, reminderId),
  });
}

async function clearReminderTables() {
  await database.delete(schema.reminders);
  await database.delete(schema.notificationPreferences);
  await database.delete(schema.unsubscribeRecords);
}

describe("reminder API", () => {
  beforeEach(async () => {
    await clearReminderTables();
  });

  it("requires sign-in for reminder management", async () => {
    const anonymous = new Headers();
    expect((await createReminder(anonymous, { title: "x", obligationDate: "2026-10-01" })).status).toBe(401);
    expect((await listReminders(anonymous)).status).toBe(401);
    expect((await getReminder(anonymous, "00000000-0000-0000-0000-000000000000")).status).toBe(401);
    expect((await updateReminder(anonymous, "00000000-0000-0000-0000-000000000000", { title: "x" })).status).toBe(401);
    expect((await deleteReminder(anonymous, "00000000-0000-0000-0000-000000000000")).status).toBe(401);
    expect((await getPreferences(anonymous)).status).toBe(401);
  });

  it("creates a reminder with default 30, 7, and 1 day offsets in Asia/Colombo", async () => {
    const headers = await signUp();
    const created = await createReminder(headers, {
      title: "Revenue licence",
      obligationDate: "2026-10-01",
    });
    expect(created.status).toBe(201);

    const reminder = (created.body as { reminder: { id: string; timezone: string; deliveries: Array<{ offsetDays: number; scheduledFor: string }> } }).reminder;
    expect(reminder.timezone).toBe("Asia/Colombo");
    expect(reminder.deliveries.map((entry) => entry.offsetDays)).toEqual([30, 7, 1]);
    expect(reminder.deliveries.find((entry) => entry.offsetDays === 30)?.scheduledFor)
      .toBe("2026-09-01T03:30:00.000Z");
    expect(reminder.deliveries.find((entry) => entry.offsetDays === 7)?.scheduledFor)
      .toBe("2026-09-24T03:30:00.000Z");
    expect(reminder.deliveries.find((entry) => entry.offsetDays === 1)?.scheduledFor)
      .toBe("2026-09-30T03:30:00.000Z");

    const listed = await listReminders(headers);
    expect(listed.status).toBe(200);
    const listBody = listed.body as { reminders: Array<{ title: string }> };
    expect(listBody.reminders).toHaveLength(1);
  });

  it("rejects duplicate offsets and deliveries scheduled in the past", async () => {
    const headers = await signUp();
    const duplicates = await createReminder(headers, {
      title: "Duplicate",
      obligationDate: "2026-10-01",
      offsets: [7, 7],
    });
    expect(duplicates.status).toBe(422);

    const past = await createReminder(headers, {
      title: "Past",
      obligationDate: "2026-10-01",
      offsets: [365],
    });
    expect(past.status).toBe(422);
  });

  it("schedules date-only obligations in the user timezone", async () => {
    const headers = await signUp();
    const created = await createReminder(headers, {
      title: "Insurance",
      obligationDate: "2026-10-01",
      timezone: "Asia/Colombo",
      offsets: [1],
    });
    const reminder = (created.body as { reminder: { deliveries: Array<{ scheduledFor: string }> } }).reminder;
    expect(reminder.deliveries[0].scheduledFor).toBe("2026-09-30T03:30:00.000Z");
  });

  it("claims each due delivery exactly once across duplicate scheduler runs", async () => {
    const headers = await signUp();
    const provider = new FakeEmailProvider();
    const { reminderId } = await createDueTomorrowReminder(headers);
    const now = new Date("2026-09-30T04:00:00.000Z");

    const first = await processDueDeliveries(now, provider);
    expect(first.processed).toBe(1);
    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0].subject).toContain("Passport renewal");

    const second = await processDueDeliveries(now, provider);
    expect(second.processed).toBe(0);
    expect(provider.sent).toHaveLength(1);

    const deliveries = await deliveriesFor(reminderId);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe("sent");
    expect(deliveries[0].attempts).toBe(1);

    const reminder = await database.query.reminders.findFirst({
      where: eq(schema.reminders.id, reminderId),
    });
    expect(reminder?.status).toBe("delivered");
  });

  it("claims each due delivery once across concurrent scheduler runs", async () => {
    const headers = await signUp();
    const firstProvider = new FakeEmailProvider();
    const secondProvider = new FakeEmailProvider();
    const { reminderId } = await createDueTomorrowReminder(headers);
    const now = new Date("2026-09-30T04:00:00.000Z");

    const results = await Promise.all([
      processDueDeliveries(now, firstProvider),
      processDueDeliveries(now, secondProvider),
    ]);

    expect(results.reduce((total, result) => total + result.processed, 0)).toBe(1);
    expect(firstProvider.sent.length + secondProvider.sent.length).toBe(1);
    const deliveries = await deliveriesFor(reminderId);
    expect(deliveries[0]).toMatchObject({ status: "sent", attempts: 1 });
  });

  it("records delivery attempts before sending and surfaces failures to operators", async () => {
    const headers = await signUp();
    const provider = new FakeEmailProvider();
    provider.queueFailure(true, "smtp temporary error");
    provider.queueFailure(false, "permanent rejection");
    const { reminderId } = await createDueTomorrowReminder(headers);
    const now = new Date("2026-09-30T04:00:00.000Z");

    await processDueDeliveries(new Date(now.getTime() + 1), provider);
    const afterFirst = await deliveriesFor(reminderId);
    expect(afterFirst[0]?.status).toBe("pending");
    expect(afterFirst[0]?.attempts).toBe(1);
    expect(afterFirst[0]?.nextAttemptAt?.toISOString()).toBe(new Date(now.getTime() + 1 + 15 * 60_000).toISOString());

    const earlyRetry = await processDueDeliveries(new Date(now.getTime() + 60_000), provider);
    expect(earlyRetry.processed).toBe(0);
    expect(provider.sent).toHaveLength(0);

    const afterBackoff = await processDueDeliveries(new Date(now.getTime() + 16 * 60_000), provider);
    expect(afterBackoff.processed).toBe(1);
    const delivery = await deliveriesFor(reminderId);
    expect(delivery[0]?.status).toBe("failed");
    expect(delivery[0]?.attempts).toBe(2);

    const reminder = await database.query.reminders.findFirst({
      where: eq(schema.reminders.id, reminderId),
    });
    expect(reminder?.status).toBe("failed");

    const attempts = await database.query.deliveryAttempts.findMany({
      where: eq(schema.deliveryAttempts.reminderId, reminderId),
      orderBy: (row, { asc }) => [asc(row.attemptedAt)],
    });
    expect(attempts.map((attempt) => attempt.outcome)).toEqual(["transient_failure", "permanent_failure"]);
    expect(attempts[0]?.attemptedAt.getTime()).toBeLessThanOrEqual(attempts[1]?.attemptedAt.getTime() ?? Infinity);
  });

  it("does not send to users who disabled email notifications", async () => {
    const headers = await signUp();
    const provider = new FakeEmailProvider();
    const { reminderId } = await createDueTomorrowReminder(headers);
    expect((await updatePreferences(headers, { emailEnabled: false })).status).toBe(200);

    await processDueDeliveries(new Date("2026-09-30T04:00:00.000Z"), provider);
    expect(provider.sent).toHaveLength(0);

    const delivery = await deliveriesFor(reminderId);
    expect(delivery[0]?.status).toBe("skipped");
  });

  it("unsubscribes a user by signed token and records the unsubscribe event", async () => {
    const headers = await signUp();
    const userId = await userIdFrom(headers);
    const provider = new FakeEmailProvider();
    const { reminderId } = await createDueTomorrowReminder(headers);

    const unsubscribeUrl = buildUnsubscribeUrl(userId);
    expect(unsubscribeUrl).toContain("/api/v1/reminders/unsubscribe?token=");
    const token = new URL(unsubscribeUrl).searchParams.get("token") ?? "";

    const response = await unsubscribeByToken(token);
    expect(response.status).toBe(200);

    const preference = await database.query.notificationPreferences.findFirst({ where: eq(schema.notificationPreferences.userId, userId) });
    expect(preference?.emailEnabled).toBe(false);
    const records = await database.query.unsubscribeRecords.findMany({
      where: eq(schema.unsubscribeRecords.userId, userId),
    });
    expect(records).toHaveLength(1);

    await processDueDeliveries(new Date("2026-09-30T04:00:00.000Z"), provider);
    expect(provider.sent).toHaveLength(0);
    const delivery = await deliveriesFor(reminderId);
    expect(delivery[0]?.status).toBe("skipped");
  });

  it("rejects an invalid unsubscribe token", async () => {
    const response = await unsubscribeByToken("not-a-valid-token");
    expect(response.status).toBe(403);
  });

  it("scopes reminders to the owning account", async () => {
    const owner = await signUp();
    const other = await signUp();
    const { reminderId } = await createDueTomorrowReminder(owner);

    expect((await getReminder(other, reminderId)).status).toBe(404);
    expect((await updateReminder(other, reminderId, { title: "Hijacked" })).status).toBe(404);
    expect((await deleteReminder(other, reminderId)).status).toBe(404);
  });

  it("cancels a reminder and stops future deliveries", async () => {
    const headers = await signUp();
    const provider = new FakeEmailProvider();
    const { reminderId } = await createDueTomorrowReminder(headers);

    expect((await updateReminder(headers, reminderId, { status: "cancelled" })).status).toBe(200);
    await processDueDeliveries(new Date("2026-09-30T04:00:00.000Z"), provider);
    expect(provider.sent).toHaveLength(0);

    const delivery = await deliveriesFor(reminderId);
    expect(delivery[0]?.status).toBe("skipped");
  });

  it("deletes a reminder and its scheduled deliveries", async () => {
    const headers = await signUp();
    const { reminderId } = await createDueTomorrowReminder(headers, [1, 7]);

    expect((await deleteReminder(headers, reminderId)).status).toBe(204);
    const remaining = await deliveriesFor(reminderId);
    expect(remaining).toHaveLength(0);
  });

  it("updates editable reminder fields", async () => {
    const headers = await signUp();
    const { reminderId } = await createDueTomorrowReminder(headers);

    const updated = await updateReminder(headers, reminderId, {
      title: "Updated title",
      note: "New note",
    });
    expect(updated.status).toBe(200);
    const reminder = (updated.body as { reminder: { title: string; note: string } }).reminder;
    expect(reminder.title).toBe("Updated title");
    expect(reminder.note).toBe("New note");
  });

  it("does not duplicate scheduled deliveries for a reminder", async () => {
    const headers = await signUp();
    const { reminderId } = await createDueTomorrowReminder(headers, [30, 7, 1]);

    const rows = await deliveriesFor(reminderId);
    expect(rows).toHaveLength(3);
    const unique = new Set(rows.map((row) => row.offsetDays));
    expect(unique.size).toBe(3);
  });

  it("returns a bodyless 204 when a reminder is deleted through the route", async () => {
    const { DELETE } = await import("@/app/api/v1/reminders/[id]/route");
    const headers = await signUp();
    const { reminderId } = await createDueTomorrowReminder(headers, [1]);

    const response = await DELETE(
      new Request(`http://127.0.0.1:3001/api/v1/reminders/${reminderId}`, { method: "DELETE", headers }),
      { params: Promise.resolve({ id: reminderId }) },
    );
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(await getReminder(headers, reminderId)).toMatchObject({ status: 404 });
  });
});
