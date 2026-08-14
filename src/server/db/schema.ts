import {
  boolean,
  date,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const calculatorClassification = pgEnum("calculator_classification", [
  "static",
  "configurable",
  "regulated",
  "data-driven",
  "workflow",
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

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  authority: varchar("authority", { length: 200 }).notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publishedOn: date("published_on"),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow().notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
