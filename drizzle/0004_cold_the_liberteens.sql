CREATE TYPE "public"."attempt_outcome" AS ENUM('success', 'transient_failure', 'permanent_failure', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'claimed', 'sent', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('active', 'cancelled', 'delivered', 'failed');--> statement-breakpoint
CREATE TABLE "delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"reminder_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"provider" varchar(40) NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "attempt_outcome",
	"detail" text
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"obligation_date" date NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Colombo' NOT NULL,
	"note" varchar(1000),
	"action_url" varchar(500),
	"status" "reminder_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"offset_days" integer NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unsubscribe_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reason" varchar(200),
	"source" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_delivery_id_scheduled_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."scheduled_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_deliveries" ADD CONSTRAINT "scheduled_deliveries_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_deliveries" ADD CONSTRAINT "scheduled_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unsubscribe_records" ADD CONSTRAINT "unsubscribe_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_attempts_delivery_idx" ON "delivery_attempts" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "reminders_user_created_idx" ON "reminders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reminders_status_idx" ON "reminders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_deliveries_reminder_offset_unique" ON "scheduled_deliveries" USING btree ("reminder_id","offset_days");--> statement-breakpoint
CREATE INDEX "scheduled_deliveries_due_idx" ON "scheduled_deliveries" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "scheduled_deliveries_retry_idx" ON "scheduled_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "scheduled_deliveries_claim_idx" ON "scheduled_deliveries" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "unsubscribe_records_user_idx" ON "unsubscribe_records" USING btree ("user_id");