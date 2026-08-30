import { createHmac, timingSafeEqual } from "node:crypto";

import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, lte, or, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DateTime } from "luxon";
import { z } from "zod";

import type { AuthenticatedSession } from "@/server/auth";
import { getSessionUser } from "@/server/auth";
import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import type { EmailProvider } from "@/server/email/provider";
import { getServerEnvironment } from "@/server/env";

type Database = PostgresJsDatabase<typeof schema>;

export type ReminderApiResponse = {
  status: number;
  body: unknown;
};

export const DEFAULT_OFFSET_DAYS = [30, 7, 1] as const;
export const MIN_OFFSET_DAYS = 1;
export const MAX_OFFSET_DAYS = 365;
export const MAX_OFFSETS = 5;
export const DELIVERY_HOUR = 9;
export const MAX_DELIVERY_ATTEMPTS = 4;
export const DELIVERY_RETRY_BACKOFFS_MS = [
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000,
];
export const STUCK_CLAIM_TIMEOUT_MS = 30 * 60_000;
export const MAX_DELIVERIES_PER_RUN = 100;
const UNSUBSCRIBE_PURPOSE = "reminder-unsubscribe";

const supportedTimeZones = new Set(Intl.supportedValuesOf("timeZone"));

const isoDate = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "The obligation date must be a calendar date like 2026-09-01.",
);

const timezoneSchema = z.string().refine(
  (value) => supportedTimeZones.has(value),
  { message: "The timezone must be a valid IANA time zone identifier." },
);

export const createReminderSchema = z.object({
  title: z.string().trim().min(1).max(200),
  obligationDate: isoDate,
  timezone: timezoneSchema.optional(),
  note: z.string().trim().max(1000).optional(),
  actionUrl: z.url().optional(),
  offsets: z
    .array(z.int().min(MIN_OFFSET_DAYS).max(MAX_OFFSET_DAYS))
    .min(1)
    .max(MAX_OFFSETS)
    .optional(),
});

export const updateReminderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  actionUrl: z.url().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one reminder field must be provided.",
});

export const preferenceUpdateSchema = z.object({
  emailEnabled: z.boolean(),
});

function unauthorized(): ReminderApiResponse {
  return {
    status: 401,
    body: {
      error: { code: "UNAUTHORIZED", message: "Sign in to manage reminders." },
    },
  };
}

function validationError(issues: z.ZodError["issues"]): ReminderApiResponse {
  return {
    status: 422,
    body: {
      error: { code: "VALIDATION_ERROR", message: "The request body is invalid.", issues },
    },
  };
}

function notFound(): ReminderApiResponse {
  return {
    status: 404,
    body: {
      error: { code: "NOT_FOUND", message: "The reminder was not found." },
    },
  };
}

async function requireSession(headers: Headers): Promise<AuthenticatedSession | ReminderApiResponse> {
  const session = await getSessionUser(headers);
  if (!session) return unauthorized();
  return session;
}

async function getOrCreatePreference(
  database: Database,
  userId: string,
): Promise<typeof schema.notificationPreferences.$inferSelect> {
  const existing = await database.query.notificationPreferences.findFirst({
    where: eq(schema.notificationPreferences.userId, userId),
  });
  if (existing) return existing;
  return database.insert(schema.notificationPreferences)
    .values({ userId })
    .onConflictDoNothing()
    .returning()
    .then(
      (rows) => rows[0]
        ?? database.query.notificationPreferences.findFirst({
          where: eq(schema.notificationPreferences.userId, userId),
        }).then((row) => {
          if (!row) throw new Error("Could not create notification preferences.");
          return row;
        }),
    );
}

function scheduledFor(
  obligationDateIso: string,
  offsetDays: number,
  timezone: string,
  hour = DELIVERY_HOUR,
): Date {
  const obligation = DateTime.fromISO(obligationDateIso, { zone: timezone });
  if (!obligation.isValid) {
    throw new Error(`Invalid obligation date ${obligationDateIso}.`);
  }
  return obligation
    .minus({ days: offsetDays })
    .set({ hour, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();
}

export function scheduleOffsets(
  obligationDateIso: string,
  offsets: readonly number[],
  timezone: string,
  hour = DELIVERY_HOUR,
): Array<{ offsetDays: number; scheduledFor: Date }> {
  return offsets.map((offsetDays) => ({
    offsetDays,
    scheduledFor: scheduledFor(obligationDateIso, offsetDays, timezone, hour),
  }));
}

function serializeReminder(
  reminder: typeof schema.reminders.$inferSelect,
  deliveries: Array<typeof schema.scheduledDeliveries.$inferSelect>,
) {
  const ordered = [...deliveries].sort((a, b) => b.offsetDays - a.offsetDays);
  return {
    id: reminder.id,
    title: reminder.title,
    obligationDate: reminder.obligationDate,
    timezone: reminder.timezone,
    note: reminder.note,
    actionUrl: reminder.actionUrl,
    status: reminder.status,
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString(),
    deliveries: ordered.map((delivery) => ({
      id: delivery.id,
      offsetDays: delivery.offsetDays,
      scheduledFor: delivery.scheduledFor.toISOString(),
      status: delivery.status,
      attempts: delivery.attempts,
      sentAt: delivery.sentAt?.toISOString() ?? null,
      detail: delivery.detail ?? null,
    })),
  };
}

export function unsubscribeToken(userId: string): string {
  const environment = getServerEnvironment();
  const signature = createHmac("sha256", environment.BETTER_AUTH_SECRET)
    .update(`${userId}:${UNSUBSCRIBE_PURPOSE}`)
    .digest("hex");
  return `${userId}.${signature}`;
}

export function resolveUnsubscribeToken(token: string): string | null {
  const separator = token.indexOf(".");
  if (separator <= 0) return null;
  const userId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", getServerEnvironment().BETTER_AUTH_SECRET)
    .update(`${userId}:${UNSUBSCRIBE_PURPOSE}`)
    .digest("hex");
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length) return null;
  return timingSafeEqual(received, expectedBuffer) ? userId : null;
}

export function buildUnsubscribeUrl(userId: string): string {
  return `${getServerEnvironment().BETTER_AUTH_URL}/api/v1/reminders/unsubscribe?token=${encodeURIComponent(unsubscribeToken(userId))}`;
}

export async function createReminder(
  headers: Headers,
  rawBody: unknown,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as ReminderApiResponse;

  const parsed = createReminderSchema.safeParse(rawBody);
  if (!parsed.success) return validationError(parsed.error.issues);

  const timezone = parsed.data.timezone
    ?? (await database.query.profiles.findFirst({
      where: eq(schema.profiles.userId, session.user.id),
    }))?.timezone
    ?? "Asia/Colombo";

  const offsets = parsed.data.offsets ?? [...DEFAULT_OFFSET_DAYS];
  const uniqueOffsets = [...new Set(offsets)];
  if (uniqueOffsets.length !== offsets.length) {
    return validationError([{ code: "custom", path: ["offsets"], message: "Offsets must not repeat." }]);
  }

  const scheduled = scheduleOffsets(parsed.data.obligationDate, offsets, timezone);
  const now = new Date();
  const past = scheduled.filter((entry) => entry.scheduledFor.getTime() < now.getTime());
  if (past.length > 0) {
    return validationError([
      {
        code: "custom",
        path: ["offsets"],
        message: `Offset ${past[0].offsetDays} would schedule a delivery in the past.`,
      },
    ]);
  }

  const reminder = await database.transaction(async (tx) => {
    const [created] = await tx.insert(schema.reminders)
      .values({
        userId: session.user.id,
        title: parsed.data.title,
        obligationDate: parsed.data.obligationDate,
        timezone,
        note: parsed.data.note,
        actionUrl: parsed.data.actionUrl,
      })
      .returning();
    await tx.insert(schema.scheduledDeliveries)
      .values(scheduled.map((entry) => ({
        reminderId: created.id,
        userId: session.user.id,
        offsetDays: entry.offsetDays,
        scheduledFor: entry.scheduledFor,
      })));
    return created;
  });

  const deliveries = await database.query.scheduledDeliveries.findMany({
    where: eq(schema.scheduledDeliveries.reminderId, reminder.id),
  });

  return {
    status: 201,
    body: { reminder: serializeReminder(reminder, deliveries) },
  };
}

export async function listReminders(
  headers: Headers,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as ReminderApiResponse;

  const reminders = await database.query.reminders.findMany({
    where: eq(schema.reminders.userId, session.user.id),
    orderBy: [desc(schema.reminders.createdAt)],
  });
  const deliveries = await database.query.scheduledDeliveries.findMany({
    where: eq(schema.scheduledDeliveries.userId, session.user.id),
  });
  const grouped = new Map<string, typeof deliveries>();
  for (const delivery of deliveries) {
    const list = grouped.get(delivery.reminderId) ?? [];
    list.push(delivery);
    grouped.set(delivery.reminderId, list);
  }

  return {
    status: 200,
    body: {
      reminders: reminders.map((reminder) => serializeReminder(reminder, grouped.get(reminder.id) ?? [])),
    },
  };
}

export async function getReminder(
  headers: Headers,
  reminderId: string,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as ReminderApiResponse;

  const reminder = await database.query.reminders.findFirst({
    where: and(eq(schema.reminders.id, reminderId), eq(schema.reminders.userId, session.user.id)),
  });
  if (!reminder) return notFound();

  const deliveries = await database.query.scheduledDeliveries.findMany({
    where: eq(schema.scheduledDeliveries.reminderId, reminder.id),
  });
  return { status: 200, body: { reminder: serializeReminder(reminder, deliveries) } };
}

export async function updateReminder(
  headers: Headers,
  reminderId: string,
  rawBody: unknown,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as ReminderApiResponse;

  const parsed = updateReminderSchema.safeParse(rawBody);
  if (!parsed.success) return validationError(parsed.error.issues);

  const reminder = await database.query.reminders.findFirst({
    where: and(eq(schema.reminders.id, reminderId), eq(schema.reminders.userId, session.user.id)),
  });
  if (!reminder) return notFound();
  if (parsed.data.status === "cancelled" && reminder.status !== "active") {
    return validationError([{ code: "custom", path: ["status"], message: "Only an active reminder can be cancelled." }]);
  }

  await database.transaction(async (tx) => {
    await tx.update(schema.reminders)
      .set({
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
        ...(parsed.data.actionUrl !== undefined ? { actionUrl: parsed.data.actionUrl } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.reminders.id, reminder.id));
    if (parsed.data.status === "cancelled") {
      await tx.update(schema.scheduledDeliveries)
        .set({
          status: "skipped",
          detail: "Reminder cancelled before delivery.",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.scheduledDeliveries.reminderId, reminder.id),
            inArray(schema.scheduledDeliveries.status, ["pending", "claimed"]),
          ),
        );
    }
  });

  return getReminder(headers, reminderId, database);
}

export async function deleteReminder(
  headers: Headers,
  reminderId: string,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as ReminderApiResponse;

  const reminder = await database.query.reminders.findFirst({
    where: and(eq(schema.reminders.id, reminderId), eq(schema.reminders.userId, session.user.id)),
  });
  if (!reminder) return notFound();

  await database.delete(schema.reminders).where(eq(schema.reminders.id, reminder.id));
  return { status: 204, body: null };
}

export async function getPreferences(
  headers: Headers,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as ReminderApiResponse;

  const preference = await getOrCreatePreference(database, session.user.id);
  const profile = await database.query.profiles.findFirst({
    where: eq(schema.profiles.userId, session.user.id),
  });

  return {
    status: 200,
    body: {
      emailEnabled: preference.emailEnabled,
      timezone: profile?.timezone ?? "Asia/Colombo",
    },
  };
}

export async function updatePreferences(
  headers: Headers,
  rawBody: unknown,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const session = await requireSession(headers);
  if ("body" in session) return session as ReminderApiResponse;

  const parsed = preferenceUpdateSchema.safeParse(rawBody);
  if (!parsed.success) return validationError(parsed.error.issues);

  const preference = await database.insert(schema.notificationPreferences)
    .values({ userId: session.user.id, emailEnabled: parsed.data.emailEnabled })
    .onConflictDoUpdate({
      target: schema.notificationPreferences.userId,
      set: { emailEnabled: parsed.data.emailEnabled, updatedAt: new Date() },
    })
    .returning()
    .then((rows) => rows[0]);

  return {
    status: 200,
    body: { emailEnabled: preference.emailEnabled },
  };
}

export async function unsubscribeByToken(
  token: string,
  source: "email-link" | "settings" = "email-link",
  reason?: string,
  database: Database = getDatabase(),
): Promise<ReminderApiResponse> {
  const userId = resolveUnsubscribeToken(token);
  if (!userId) {
    return {
      status: 403,
      body: { error: { code: "INVALID_TOKEN", message: "The unsubscribe link is invalid or has expired." } },
    };
  }

  const user = await database.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return notFound();

  await database.transaction(async (tx) => {
    await tx.insert(schema.notificationPreferences)
      .values({ userId, emailEnabled: false })
      .onConflictDoUpdate({
        target: schema.notificationPreferences.userId,
        set: { emailEnabled: false, updatedAt: new Date() },
      });
    await tx.insert(schema.unsubscribeRecords)
      .values({ userId, source, reason });
  });

  return { status: 200, body: { email: user.email } };
}

export async function processDueDeliveries(
  now: Date,
  provider: EmailProvider,
  database: Database = getDatabase(),
): Promise<{ processed: number; attempted: number }> {
  const claimed = await claimDueDeliveries(now, database);
  let attempted = 0;
  const affectedReminderIds = new Set<string>();

  for (const delivery of claimed) {
    affectedReminderIds.add(delivery.reminderId);
    await processDelivery(delivery, provider, now, database);
    attempted += 1;
  }

  for (const reminderId of affectedReminderIds) {
    await reconcileReminder(reminderId, database);
  }

  return { processed: attempted, attempted };
}

function dueDeliveriesWhere(now: Date): SQL | undefined {
  const stuckBefore = new Date(now.getTime() - STUCK_CLAIM_TIMEOUT_MS);
  return or(
    and(
      eq(schema.scheduledDeliveries.status, "pending"),
      isNull(schema.scheduledDeliveries.nextAttemptAt),
      lte(schema.scheduledDeliveries.scheduledFor, now),
    ),
    and(
      eq(schema.scheduledDeliveries.status, "pending"),
      isNotNull(schema.scheduledDeliveries.nextAttemptAt),
      lte(schema.scheduledDeliveries.nextAttemptAt, now),
    ),
    and(
      eq(schema.scheduledDeliveries.status, "claimed"),
      lt(schema.scheduledDeliveries.updatedAt, stuckBefore),
    ),
  );
}

async function claimDueDeliveries(now: Date, database: Database) {
  return database.transaction(async (tx) => {
    const rows = await tx.select()
      .from(schema.scheduledDeliveries)
      .where(dueDeliveriesWhere(now))
      .orderBy(asc(schema.scheduledDeliveries.scheduledFor))
      .limit(MAX_DELIVERIES_PER_RUN)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return rows;

    await tx.update(schema.scheduledDeliveries)
      .set({ status: "claimed", updatedAt: now })
      .where(inArray(schema.scheduledDeliveries.id, rows.map((row) => row.id)));
    return rows;
  });
}

function buildMessage(
  reminder: typeof schema.reminders.$inferSelect,
  user: { email: string },
  unsubscribeUrl: string,
) {
  const parts = [
    `This is a reminder for: ${reminder.title}`,
    `Obligation date: ${reminder.obligationDate}`,
    `Timezone: ${reminder.timezone}`,
  ];
  if (reminder.note) parts.push("", reminder.note);
  if (reminder.actionUrl) parts.push("", `Open the related guidance: ${reminder.actionUrl}`);
  parts.push(
    "",
    "This is an estimate and is not legal or compliance advice.",
    "",
    `To stop receiving reminder emails, visit: ${unsubscribeUrl}`,
  );
  return {
    to: user.email,
    subject: `Reminder: ${reminder.title}`,
    text: parts.join("\n"),
  };
}

async function processDelivery(
  delivery: typeof schema.scheduledDeliveries.$inferSelect,
  provider: EmailProvider,
  now: Date,
  database: Database,
) {
  const reminder = await database.query.reminders.findFirst({
    where: eq(schema.reminders.id, delivery.reminderId),
  });
  if (!reminder || reminder.status !== "active") {
    await database.update(schema.scheduledDeliveries)
      .set({ status: "skipped", detail: "Reminder is no longer active.", updatedAt: now })
      .where(eq(schema.scheduledDeliveries.id, delivery.id));
    return;
  }

  const preference = await getOrCreatePreference(database, delivery.userId);
  if (!preference.emailEnabled) {
    await database.update(schema.scheduledDeliveries)
      .set({ status: "skipped", detail: "Email notifications are disabled.", updatedAt: now })
      .where(eq(schema.scheduledDeliveries.id, delivery.id));
    return;
  }

  const user = await database.query.users.findFirst({ where: eq(schema.users.id, delivery.userId) });
  if (!user) {
    await database.update(schema.scheduledDeliveries)
      .set({ status: "failed", detail: "Account no longer exists.", updatedAt: now })
      .where(eq(schema.scheduledDeliveries.id, delivery.id));
    return;
  }

  const message = buildMessage(reminder, user, buildUnsubscribeUrl(user.id));
  const [attempt] = await database.insert(schema.deliveryAttempts)
    .values({
      deliveryId: delivery.id,
      reminderId: reminder.id,
      userId: user.id,
      provider: provider.name,
    })
    .returning();

  const result = await provider.send(message);
  const nextAttempts = delivery.attempts + 1;

  if (result.ok) {
    await database.update(schema.deliveryAttempts)
      .set({ outcome: "success", detail: result.detail })
      .where(eq(schema.deliveryAttempts.id, attempt.id));
    await database.update(schema.scheduledDeliveries)
      .set({
        status: "sent",
        attempts: nextAttempts,
        sentAt: now,
        nextAttemptAt: null,
        detail: result.detail,
        updatedAt: now,
      })
      .where(eq(schema.scheduledDeliveries.id, delivery.id));
    return;
  }

  const exhausted = nextAttempts >= MAX_DELIVERY_ATTEMPTS || !result.transient;
  await database.update(schema.deliveryAttempts)
    .set({ outcome: exhausted ? "permanent_failure" : "transient_failure", detail: result.detail })
    .where(eq(schema.deliveryAttempts.id, attempt.id));
  await database.update(schema.scheduledDeliveries)
    .set({
      status: exhausted ? "failed" : "pending",
      attempts: nextAttempts,
      nextAttemptAt: exhausted ? null : new Date(now.getTime() + DELIVERY_RETRY_BACKOFFS_MS[nextAttempts - 1]),
      detail: result.detail,
      updatedAt: now,
    })
    .where(eq(schema.scheduledDeliveries.id, delivery.id));
}

async function reconcileReminder(reminderId: string, database: Database) {
  const reminder = await database.query.reminders.findFirst({
    where: eq(schema.reminders.id, reminderId),
  });
  if (!reminder || reminder.status !== "active") return;

  const deliveries = await database.query.scheduledDeliveries.findMany({
    where: eq(schema.scheduledDeliveries.reminderId, reminderId),
  });
  const anyFailed = deliveries.some((delivery) => delivery.status === "failed");
  const allFinished = deliveries.every((delivery) =>
    ["sent", "skipped", "failed"].includes(delivery.status));

  if (anyFailed) {
    await database.update(schema.reminders)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(schema.reminders.id, reminderId));
  } else if (allFinished) {
    await database.update(schema.reminders)
      .set({ status: "delivered", updatedAt: new Date() })
      .where(eq(schema.reminders.id, reminderId));
  }
}
