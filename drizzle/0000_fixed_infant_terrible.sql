CREATE TYPE "public"."calculator_classification" AS ENUM('static', 'configurable', 'regulated', 'data-driven', 'workflow');--> statement-breakpoint
CREATE TABLE "calculator_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"classification" "calculator_classification" NOT NULL,
	"version" varchar(40) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculator_sources" (
	"calculator_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"note" text,
	CONSTRAINT "calculator_sources_calculator_id_source_id_pk" PRIMARY KEY("calculator_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"authority" varchar(200) NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_on" date,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calculator_sources" ADD CONSTRAINT "calculator_sources_calculator_id_calculator_definitions_id_fk" FOREIGN KEY ("calculator_id") REFERENCES "public"."calculator_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculator_sources" ADD CONSTRAINT "calculator_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calculator_definitions_key_unique" ON "calculator_definitions" USING btree ("key");