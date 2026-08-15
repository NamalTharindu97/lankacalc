import {
  boolean,
  char,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const bytea = customType<{ data: Buffer; driverData: Uint8Array }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return new Uint8Array(value);
  },
  fromDriver(value: Uint8Array) {
    return Buffer.from(value);
  },
});

export const calculatorClassification = pgEnum("calculator_classification", [
  "static",
  "configurable",
  "regulated",
  "data-driven",
  "workflow",
]);

export const sourceVerificationOutcome = pgEnum("source_verification_outcome", [
  "verified",
  "rejected",
]);

export const sourceLinkStatus = pgEnum("source_link_status", [
  "healthy",
  "redirected",
  "changed",
  "broken",
  "error",
]);

export const ruleVersionStatus = pgEnum("rule_version_status", [
  "draft",
  "reviewed",
  "scheduled",
  "published",
  "retired",
]);

export const publicationEventType = pgEnum("publication_event_type", [
  "reviewed",
  "scheduled",
  "published",
  "retired",
]);

export const reportStatus = pgEnum("report_status", [
  "queued",
  "generating",
  "ready",
  "failed",
]);

export const calculatorDefinitions = pgTable(
  "calculator_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    classification: calculatorClassification("classification").notNull(),
    version: varchar("version", { length: 40 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("calculator_definitions_key_unique").on(table.key)],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    authority: varchar("authority", { length: 200 }).notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    official: boolean("official").default(true).notNull(),
    publishedOn: date("published_on"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow().notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("sources_key_unique").on(table.key)],
);

export const sourceRevisions = pgTable(
  "source_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    authority: varchar("authority", { length: 200 }).notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    official: boolean("official").notNull(),
    publishedOn: date("published_on"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    contentHash: char("content_hash", { length: 64 }),
    archiveUrl: text("archive_url"),
    changeNote: text("change_note").notNull(),
    createdBy: varchar("created_by", { length: 160 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("source_revisions_source_revision_unique").on(table.sourceId, table.revision),
    index("source_revisions_source_created_idx").on(table.sourceId, table.createdAt),
  ],
);

export const verificationEvents = pgTable(
  "verification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceRevisionId: uuid("source_revision_id")
      .notNull()
      .references(() => sourceRevisions.id, { onDelete: "restrict" }),
    outcome: sourceVerificationOutcome("outcome").notNull(),
    verifier: varchar("verifier", { length: 160 }).notNull(),
    reason: text("reason").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_events_source_verified_idx").on(table.sourceId, table.verifiedAt)],
);

export const sourceLinkChecks = pgTable(
  "source_link_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceRevisionId: uuid("source_revision_id")
      .notNull()
      .references(() => sourceRevisions.id, { onDelete: "restrict" }),
    status: sourceLinkStatus("status").notNull(),
    httpStatus: smallint("http_status"),
    finalUrl: text("final_url"),
    etag: text("etag"),
    lastModified: text("last_modified"),
    contentHash: char("content_hash", { length: 64 }),
    detail: text("detail"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("source_link_checks_source_checked_idx").on(table.sourceId, table.checkedAt)],
);

export const calculatorSources = pgTable(
  "calculator_sources",
  {
    calculatorId: uuid("calculator_id")
      .notNull()
      .references(() => calculatorDefinitions.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.calculatorId, table.sourceId] })],
);

export const ruleDefinitions = pgTable(
  "rule_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    calculatorKey: varchar("calculator_key", { length: 80 }).notNull(),
    scope: varchar("scope", { length: 120 }).default("default").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    createdBy: varchar("created_by", { length: 160 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rule_definitions_key_scope_unique").on(table.key, table.scope),
    index("rule_definitions_calculator_idx").on(table.calculatorKey),
  ],
);

export const ruleVersions = pgTable(
  "rule_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ruleDefinitionId: uuid("rule_definition_id")
      .notNull()
      .references(() => ruleDefinitions.id, { onDelete: "restrict" }),
    version: varchar("version", { length: 40 }).notNull(),
    status: ruleVersionStatus("status").default("draft").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    payload: jsonb("payload").notNull(),
    payloadSchemaVersion: varchar("payload_schema_version", { length: 40 }).notNull(),
    checksum: char("checksum", { length: 64 }).notNull(),
    author: varchar("author", { length: 160 }).notNull(),
    reviewer: varchar("reviewer", { length: 160 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    retiredEffectiveOn: date("retired_effective_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rule_versions_definition_version_unique").on(table.ruleDefinitionId, table.version),
    index("rule_versions_resolution_idx").on(table.ruleDefinitionId, table.status, table.effectiveFrom),
    check(
      "rule_versions_effective_range_check",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    check(
      "rule_versions_retirement_date_check",
      sql`((${table.status} = 'retired') = (${table.retiredEffectiveOn} is not null)) and (${table.retiredEffectiveOn} is null or ${table.retiredEffectiveOn} >= ${table.effectiveFrom})`,
    ),
  ],
);

export const ruleVersionSources = pgTable(
  "rule_version_sources",
  {
    ruleVersionId: uuid("rule_version_id")
      .notNull()
      .references(() => ruleVersions.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    sourceRevisionId: uuid("source_revision_id")
      .notNull()
      .references(() => sourceRevisions.id, { onDelete: "restrict" }),
    verificationEventId: uuid("verification_event_id")
      .notNull()
      .references(() => verificationEvents.id, { onDelete: "restrict" }),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.ruleVersionId, table.sourceId] })],
);

export const publicationEvents = pgTable(
  "publication_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ruleVersionId: uuid("rule_version_id")
      .notNull()
      .references(() => ruleVersions.id, { onDelete: "restrict" }),
    type: publicationEventType("type").notNull(),
    actor: varchar("actor", { length: 160 }).notNull(),
    reason: text("reason").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("publication_events_version_created_idx").on(table.ruleVersionId, table.createdAt)],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    email_verified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_idx").on(table.user_id),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    account_id: text("account_id").notNull(),
    provider_id: text("provider_id").notNull(),
    access_token: text("access_token"),
    refresh_token: text("refresh_token"),
    access_token_expires_at: timestamp("access_token_expires_at", { withTimezone: true }),
    refresh_token_expires_at: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    id_token: text("id_token"),
    password: text("password"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("auth_accounts_user_idx").on(table.user_id),
    index("auth_accounts_provider_idx").on(table.provider_id),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 35 }).notNull().default("en"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Colombo"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [check("profiles_locale_check", sql`${table.locale} in ('en', 'si', 'ta')`)],
);

export const savedCalculations = pgTable(
  "saved_calculations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    calculatorKey: varchar("calculator_key", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("saved_calculations_user_created_idx").on(table.userId, table.createdAt),
    index("saved_calculations_calculator_idx").on(table.calculatorKey),
  ],
);

export const calculationSnapshots = pgTable(
  "calculation_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    savedCalculationId: uuid("saved_calculation_id")
      .notNull()
      .references(() => savedCalculations.id, { onDelete: "cascade" }),
    input: jsonb("input").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("calculation_snapshots_saved_idx").on(table.savedCalculationId)],
);

export const reminderStatus = pgEnum("reminder_status", [
  "active",
  "cancelled",
  "delivered",
  "failed",
]);

export const deliveryStatus = pgEnum("delivery_status", [
  "pending",
  "claimed",
  "sent",
  "skipped",
  "failed",
]);

export const attemptOutcome = pgEnum("attempt_outcome", [
  "success",
  "transient_failure",
  "permanent_failure",
  "skipped",
]);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    obligationDate: date("obligation_date").notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Colombo"),
    note: varchar("note", { length: 1000 }),
    actionUrl: varchar("action_url", { length: 500 }),
    status: reminderStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reminders_user_created_idx").on(table.userId, table.createdAt),
    index("reminders_status_idx").on(table.status),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const scheduledDeliveries = pgTable(
  "scheduled_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reminderId: uuid("reminder_id")
      .notNull()
      .references(() => reminders.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    offsetDays: integer("offset_days").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: deliveryStatus("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scheduled_deliveries_reminder_offset_unique").on(table.reminderId, table.offsetDays),
    index("scheduled_deliveries_due_idx").on(table.status, table.scheduledFor),
    index("scheduled_deliveries_retry_idx").on(table.status, table.nextAttemptAt),
    index("scheduled_deliveries_claim_idx").on(table.status, table.updatedAt),
  ],
);

export const deliveryAttempts = pgTable(
  "delivery_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => scheduledDeliveries.id, { onDelete: "cascade" }),
    reminderId: uuid("reminder_id")
      .notNull()
      .references(() => reminders.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
    outcome: attemptOutcome("outcome"),
    detail: text("detail"),
  },
  (table) => [index("delivery_attempts_delivery_idx").on(table.deliveryId)],
);

export const unsubscribeRecords = pgTable(
  "unsubscribe_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 200 }),
    source: varchar("source", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("unsubscribe_records_user_idx").on(table.userId)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    savedCalculationId: uuid("saved_calculation_id")
      .notNull()
      .references(() => savedCalculations.id, { onDelete: "cascade" }),
    status: reportStatus("status").default("queued").notNull(),
    format: varchar("format", { length: 16 }).default("pdf").notNull(),
    reportVersion: varchar("report_version", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    snapshot: jsonb("snapshot").notNull(),
    pdf: bytea("pdf"),
    pdfSize: integer("pdf_size"),
    pdfChecksum: char("pdf_checksum", { length: 64 }),
    downloadExpiresAt: timestamp("download_expires_at", { withTimezone: true }),
    lastDownloadedAt: timestamp("last_downloaded_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reports_user_created_idx").on(table.userId, table.createdAt),
    index("reports_saved_idx").on(table.savedCalculationId),
    index("reports_status_idx").on(table.status),
  ],
);

export const ruleValidationFixtures = pgTable(
  "rule_validation_fixtures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ruleVersionId: uuid("rule_version_id")
      .notNull()
      .references(() => ruleVersions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    input: jsonb("input").notNull(),
    expectedResult: jsonb("expected_result").notNull(),
    actualResult: jsonb("actual_result"),
    passed: boolean("passed"),
    ruleChecksum: char("rule_checksum", { length: 64 }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rule_validation_fixtures_version_name_unique").on(table.ruleVersionId, table.name),
  ],
);
