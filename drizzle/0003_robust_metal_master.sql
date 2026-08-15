CREATE TYPE "public"."report_status" AS ENUM('queued', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"saved_calculation_id" uuid NOT NULL,
	"status" "report_status" DEFAULT 'queued' NOT NULL,
	"format" varchar(16) DEFAULT 'pdf' NOT NULL,
	"report_version" varchar(40) NOT NULL,
	"title" varchar(200) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"snapshot" jsonb NOT NULL,
	"pdf" "bytea",
	"pdf_size" integer,
	"pdf_checksum" char(64),
	"download_expires_at" timestamp with time zone,
	"last_downloaded_at" timestamp with time zone,
	"error_message" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_saved_calculation_id_saved_calculations_id_fk" FOREIGN KEY ("saved_calculation_id") REFERENCES "public"."saved_calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_user_created_idx" ON "reports" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_saved_idx" ON "reports" USING btree ("saved_calculation_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");