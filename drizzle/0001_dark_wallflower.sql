CREATE TYPE "public"."publication_event_type" AS ENUM('reviewed', 'scheduled', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."rule_version_status" AS ENUM('draft', 'reviewed', 'scheduled', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."source_link_status" AS ENUM('healthy', 'redirected', 'changed', 'broken', 'error');--> statement-breakpoint
CREATE TYPE "public"."source_verification_outcome" AS ENUM('verified', 'rejected');--> statement-breakpoint
CREATE TABLE "publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_version_id" uuid NOT NULL,
	"type" "publication_event_type" NOT NULL,
	"actor" varchar(160) NOT NULL,
	"reason" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"calculator_key" varchar(80) NOT NULL,
	"scope" varchar(120) DEFAULT 'default' NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"created_by" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_validation_fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_version_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"input" jsonb NOT NULL,
	"expected_result" jsonb NOT NULL,
	"actual_result" jsonb,
	"passed" boolean,
	"rule_checksum" char(64),
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_version_sources" (
	"rule_version_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_revision_id" uuid NOT NULL,
	"verification_event_id" uuid NOT NULL,
	"note" text,
	CONSTRAINT "rule_version_sources_rule_version_id_source_id_pk" PRIMARY KEY("rule_version_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_definition_id" uuid NOT NULL,
	"version" varchar(40) NOT NULL,
	"status" "rule_version_status" DEFAULT 'draft' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"payload" jsonb NOT NULL,
	"payload_schema_version" varchar(40) NOT NULL,
	"checksum" char(64) NOT NULL,
	"author" varchar(160) NOT NULL,
	"reviewer" varchar(160),
	"reviewed_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"retired_effective_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_versions_effective_range_check" CHECK ("rule_versions"."effective_to" is null or "rule_versions"."effective_to" >= "rule_versions"."effective_from"),
	CONSTRAINT "rule_versions_retirement_date_check" CHECK ((("rule_versions"."status" = 'retired') = ("rule_versions"."retired_effective_on" is not null)) and ("rule_versions"."retired_effective_on" is null or "rule_versions"."retired_effective_on" >= "rule_versions"."effective_from"))
);
--> statement-breakpoint
CREATE TABLE "source_link_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"source_revision_id" uuid NOT NULL,
	"status" "source_link_status" NOT NULL,
	"http_status" smallint,
	"final_url" text,
	"etag" text,
	"last_modified" text,
	"content_hash" char(64),
	"detail" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"authority" varchar(200) NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"official" boolean NOT NULL,
	"published_on" date,
	"retrieved_at" timestamp with time zone NOT NULL,
	"content_hash" char(64),
	"archive_url" text,
	"change_note" text NOT NULL,
	"created_by" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"source_revision_id" uuid NOT NULL,
	"outcome" "source_verification_outcome" NOT NULL,
	"verifier" varchar(160) NOT NULL,
	"reason" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "verified_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "key" varchar(120);--> statement-breakpoint
UPDATE "sources" SET "key" = 'legacy-' || "id"::text WHERE "key" IS NULL;--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "official" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
INSERT INTO "source_revisions" (
  "source_id", "revision", "authority", "title", "url", "official", "published_on", "retrieved_at",
  "change_note", "created_by", "created_at"
)
SELECT "id", 1, "authority", "title", "url", "official", "published_on", "retrieved_at",
  'Backfilled from the foundation source registry.', 'migration-0001', "created_at"
FROM "sources";--> statement-breakpoint
INSERT INTO "verification_events" (
  "source_id", "source_revision_id", "outcome", "verifier", "reason", "verified_at"
)
SELECT s."id", sr."id", 'verified', 'migration-0001',
  'Backfilled from the foundation verified_at value.', s."verified_at"
FROM "sources" s
JOIN "source_revisions" sr ON sr."source_id" = s."id" AND sr."revision" = 1
WHERE s."verified_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."rule_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_validation_fixtures" ADD CONSTRAINT "rule_validation_fixtures_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."rule_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_version_sources" ADD CONSTRAINT "rule_version_sources_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."rule_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_version_sources" ADD CONSTRAINT "rule_version_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_version_sources" ADD CONSTRAINT "rule_version_sources_source_revision_id_source_revisions_id_fk" FOREIGN KEY ("source_revision_id") REFERENCES "public"."source_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_version_sources" ADD CONSTRAINT "rule_version_sources_verification_event_id_verification_events_id_fk" FOREIGN KEY ("verification_event_id") REFERENCES "public"."verification_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_rule_definition_id_rule_definitions_id_fk" FOREIGN KEY ("rule_definition_id") REFERENCES "public"."rule_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_link_checks" ADD CONSTRAINT "source_link_checks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_link_checks" ADD CONSTRAINT "source_link_checks_source_revision_id_source_revisions_id_fk" FOREIGN KEY ("source_revision_id") REFERENCES "public"."source_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_revisions" ADD CONSTRAINT "source_revisions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_source_revision_id_source_revisions_id_fk" FOREIGN KEY ("source_revision_id") REFERENCES "public"."source_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publication_events_version_created_idx" ON "publication_events" USING btree ("rule_version_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_definitions_key_scope_unique" ON "rule_definitions" USING btree ("key","scope");--> statement-breakpoint
CREATE INDEX "rule_definitions_calculator_idx" ON "rule_definitions" USING btree ("calculator_key");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_validation_fixtures_version_name_unique" ON "rule_validation_fixtures" USING btree ("rule_version_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_versions_definition_version_unique" ON "rule_versions" USING btree ("rule_definition_id","version");--> statement-breakpoint
CREATE INDEX "rule_versions_resolution_idx" ON "rule_versions" USING btree ("rule_definition_id","status","effective_from");--> statement-breakpoint
CREATE INDEX "source_link_checks_source_checked_idx" ON "source_link_checks" USING btree ("source_id","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_revisions_source_revision_unique" ON "source_revisions" USING btree ("source_id","revision");--> statement-breakpoint
CREATE INDEX "source_revisions_source_created_idx" ON "source_revisions" USING btree ("source_id","created_at");--> statement-breakpoint
CREATE INDEX "verification_events_source_verified_idx" ON "verification_events" USING btree ("source_id","verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_key_unique" ON "sources" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "source_revisions_id_source_unique" ON "source_revisions" ("id", "source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_events_id_revision_source_unique" ON "verification_events" ("id", "source_revision_id", "source_id");--> statement-breakpoint
ALTER TABLE "rule_version_sources" ADD CONSTRAINT "rule_version_sources_revision_source_fk"
  FOREIGN KEY ("source_revision_id", "source_id") REFERENCES "source_revisions" ("id", "source_id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "rule_version_sources" ADD CONSTRAINT "rule_version_sources_verification_revision_source_fk"
  FOREIGN KEY ("verification_event_id", "source_revision_id", "source_id")
  REFERENCES "verification_events" ("id", "source_revision_id", "source_id") ON DELETE restrict;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_active_period_exclude"
  EXCLUDE USING gist (
    "rule_definition_id" WITH =,
    daterange(
      "effective_from",
      LEAST(
        COALESCE("effective_to" + 1, 'infinity'::date),
        COALESCE("retired_effective_on", 'infinity'::date)
      ),
      '[)'
    ) WITH &&
  ) WHERE ("status" IN ('scheduled', 'published', 'retired'));--> statement-breakpoint
CREATE FUNCTION prevent_published_rule_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status IN ('reviewed', 'scheduled', 'published', 'retired') THEN
    RAISE EXCEPTION 'reviewed and published rule versions are immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('reviewed', 'scheduled', 'published', 'retired') THEN
    IF ROW(NEW.rule_definition_id, NEW.version, NEW.effective_from, NEW.effective_to, NEW.payload,
      NEW.payload_schema_version, NEW.checksum, NEW.author, NEW.reviewer, NEW.reviewed_at, NEW.created_at)
      IS DISTINCT FROM
      ROW(OLD.rule_definition_id, OLD.version, OLD.effective_from, OLD.effective_to, OLD.payload,
      OLD.payload_schema_version, OLD.checksum, OLD.author, OLD.reviewer, OLD.reviewed_at, OLD.created_at) THEN
      RAISE EXCEPTION 'reviewed and published rule versions are immutable';
    END IF;
    IF OLD.status = 'reviewed' AND NEW.status IN ('scheduled', 'published') AND NEW.retired_effective_on IS NULL THEN RETURN NEW; END IF;
    IF OLD.status = 'scheduled' AND NEW.status = 'published' AND NEW.published_at IS NOT NULL AND NEW.retired_effective_on IS NULL THEN RETURN NEW; END IF;
    IF OLD.status IN ('scheduled', 'published') AND NEW.status = 'retired'
      AND NEW.retired_at IS NOT NULL AND NEW.retired_effective_on IS NOT NULL THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'reviewed and published rule versions are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "rule_versions_immutable" BEFORE UPDATE OR DELETE ON "rule_versions"
  FOR EACH ROW EXECUTE FUNCTION prevent_published_rule_mutation();--> statement-breakpoint
CREATE FUNCTION enforce_rule_publication_requirements() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'new rule versions must start as draft'; END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('draft', 'reviewed')) OR
    (OLD.status = 'reviewed' AND NEW.status IN ('scheduled', 'published')) OR
    (OLD.status = 'scheduled' AND NEW.status IN ('published', 'retired')) OR
    (OLD.status = 'published' AND NEW.status = 'retired')
  ) THEN
    RAISE EXCEPTION 'invalid rule lifecycle transition';
  END IF;
  IF (NEW.status IN ('scheduled', 'published') AND OLD.status NOT IN ('scheduled', 'published'))
    OR (OLD.status = 'scheduled' AND NEW.status = 'published') THEN
    IF NEW.reviewer IS NULL OR NEW.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'review is required before publication';
    END IF;
    PERFORM s.id FROM sources s
    WHERE s.id IN (SELECT source_id FROM rule_version_sources WHERE rule_version_id = NEW.id)
    ORDER BY s.id FOR UPDATE;
    IF NOT EXISTS (
      SELECT 1 FROM rule_version_sources rvs
      JOIN source_revisions sr ON sr.id = rvs.source_revision_id AND sr.source_id = rvs.source_id
      JOIN verification_events ve ON ve.id = rvs.verification_event_id
        AND ve.source_revision_id = sr.id AND ve.source_id = sr.source_id
      WHERE rvs.rule_version_id = NEW.id AND sr.official = true AND ve.outcome = 'verified'
        AND EXISTS (
          SELECT 1 FROM verification_events latest_ve
          JOIN source_link_checks slc ON slc.source_revision_id = latest_ve.source_revision_id
          WHERE latest_ve.source_revision_id = sr.id
            AND latest_ve.id = (
              SELECT candidate_ve.id FROM verification_events candidate_ve
              WHERE candidate_ve.source_revision_id = sr.id
              ORDER BY candidate_ve.verified_at DESC, candidate_ve.id DESC LIMIT 1
            )
            AND latest_ve.outcome = 'verified'
            AND slc.id = (
              SELECT latest_slc.id FROM source_link_checks latest_slc
              WHERE latest_slc.source_revision_id = sr.id
              ORDER BY latest_slc.checked_at DESC, latest_slc.id DESC LIMIT 1
            )
            AND slc.status IN ('healthy', 'redirected') AND slc.checked_at <= latest_ve.verified_at
        )
    ) THEN
      RAISE EXCEPTION 'a current verified official source revision is required before publication';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rule_validation_fixtures f WHERE f.rule_version_id = NEW.id)
      OR EXISTS (
        SELECT 1 FROM rule_validation_fixtures f
        WHERE f.rule_version_id = NEW.id AND (f.passed IS DISTINCT FROM true OR f.rule_checksum IS DISTINCT FROM NEW.checksum)
      ) THEN
      RAISE EXCEPTION 'passing fixtures for the current checksum are required before publication';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "rule_versions_publication_gate" BEFORE INSERT OR UPDATE ON "rule_versions"
  FOR EACH ROW EXECUTE FUNCTION enforce_rule_publication_requirements();--> statement-breakpoint
CREATE FUNCTION prevent_published_rule_child_mutation() RETURNS trigger AS $$
DECLARE
  old_status rule_version_status;
  new_status rule_version_status;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT status INTO old_status FROM rule_versions WHERE id = OLD.rule_version_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT status INTO new_status FROM rule_versions WHERE id = NEW.rule_version_id;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.rule_version_id IS DISTINCT FROM NEW.rule_version_id THEN
    RAISE EXCEPTION 'rule evidence cannot be reassigned';
  END IF;
  IF old_status IN ('reviewed', 'scheduled', 'published', 'retired')
    OR new_status IN ('reviewed', 'scheduled', 'published', 'retired') THEN
    RAISE EXCEPTION 'reviewed and published rule evidence is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "rule_version_sources_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "rule_version_sources"
  FOR EACH ROW EXECUTE FUNCTION prevent_published_rule_child_mutation();--> statement-breakpoint
CREATE TRIGGER "rule_validation_fixtures_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "rule_validation_fixtures"
  FOR EACH ROW EXECUTE FUNCTION prevent_published_rule_child_mutation();--> statement-breakpoint
CREATE FUNCTION prevent_append_only_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "source_revisions_append_only" BEFORE UPDATE OR DELETE ON "source_revisions"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();--> statement-breakpoint
CREATE TRIGGER "verification_events_append_only" BEFORE UPDATE OR DELETE ON "verification_events"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();--> statement-breakpoint
CREATE TRIGGER "source_link_checks_append_only" BEFORE UPDATE OR DELETE ON "source_link_checks"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();--> statement-breakpoint
CREATE TRIGGER "publication_events_append_only" BEFORE UPDATE OR DELETE ON "publication_events"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
