CREATE TYPE "public"."decision_node_type" AS ENUM('single-choice', 'multi-choice', 'text', 'date');--> statement-breakpoint
CREATE TYPE "public"."guide_status" AS ENUM('draft', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."guide_version_status" AS ENUM('draft', 'reviewed', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."translation_status" AS ENUM('draft', 'reviewed', 'published', 'stale');--> statement-breakpoint
CREATE TABLE "content_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_version_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"authority" varchar(200) NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"published_on" date,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"field" varchar(60) NOT NULL,
	"value" text NOT NULL,
	"status" "translation_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"from_node_id" uuid,
	"to_node_id" uuid,
	"to_outcome_id" uuid,
	"condition" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"type" "decision_node_type" NOT NULL,
	"question" varchar(1000) NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"offices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"escalation" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_trees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_version_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_validation_fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_version_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"answers" jsonb NOT NULL,
	"expected_outcome" varchar(100) NOT NULL,
	"passed" boolean,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"version" varchar(40) NOT NULL,
	"status" "guide_version_status" DEFAULT 'draft' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_by" text NOT NULL,
	"reviewed_by" text,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"product" varchar(40) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"status" "guide_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'queued'::text;--> statement-breakpoint
DROP TYPE "public"."report_status";--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('queued', 'generating', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'queued'::"public"."report_status";--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "status" SET DATA TYPE "public"."report_status" USING "status"::"public"."report_status";--> statement-breakpoint
ALTER TABLE "content_sources" ADD CONSTRAINT "content_sources_guide_version_id_guide_versions_id_fk" FOREIGN KEY ("guide_version_id") REFERENCES "public"."guide_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_edges" ADD CONSTRAINT "decision_edges_tree_id_decision_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."decision_trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_edges" ADD CONSTRAINT "decision_edges_from_node_id_decision_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."decision_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_edges" ADD CONSTRAINT "decision_edges_to_node_id_decision_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."decision_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_edges" ADD CONSTRAINT "decision_edges_to_outcome_id_decision_outcomes_id_fk" FOREIGN KEY ("to_outcome_id") REFERENCES "public"."decision_outcomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_nodes" ADD CONSTRAINT "decision_nodes_tree_id_decision_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."decision_trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_tree_id_decision_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."decision_trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_trees" ADD CONSTRAINT "decision_trees_guide_version_id_guide_versions_id_fk" FOREIGN KEY ("guide_version_id") REFERENCES "public"."guide_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_validation_fixtures" ADD CONSTRAINT "guide_validation_fixtures_guide_version_id_guide_versions_id_fk" FOREIGN KEY ("guide_version_id") REFERENCES "public"."guide_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_versions" ADD CONSTRAINT "guide_versions_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_sources_guide_version_idx" ON "content_sources" USING btree ("guide_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_translations_entity_unique" ON "content_translations" USING btree ("entity_type","entity_id","locale","field");--> statement-breakpoint
CREATE INDEX "decision_edges_tree_idx" ON "decision_edges" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "decision_edges_from_node_idx" ON "decision_edges" USING btree ("from_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_nodes_tree_key_unique" ON "decision_nodes" USING btree ("tree_id","key");--> statement-breakpoint
CREATE INDEX "decision_nodes_tree_idx" ON "decision_nodes" USING btree ("tree_id");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_outcomes_tree_key_unique" ON "decision_outcomes" USING btree ("tree_id","key");--> statement-breakpoint
CREATE INDEX "decision_outcomes_tree_idx" ON "decision_outcomes" USING btree ("tree_id");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_trees_guide_version_unique" ON "decision_trees" USING btree ("guide_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_fixtures_version_name_unique" ON "guide_validation_fixtures" USING btree ("guide_version_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_versions_guide_version_unique" ON "guide_versions" USING btree ("guide_id","version");--> statement-breakpoint
CREATE INDEX "guide_versions_guide_status_idx" ON "guide_versions" USING btree ("guide_id","status");--> statement-breakpoint
CREATE INDEX "guides_product_idx" ON "guides" USING btree ("product");