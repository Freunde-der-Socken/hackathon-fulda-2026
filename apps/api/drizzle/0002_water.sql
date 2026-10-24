CREATE TABLE "silent_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"quiet_share" double precision,
	"water" integer
);
--> statement-breakpoint
CREATE TABLE "water_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"source" text NOT NULL,
	"silent_phase_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "silent_phases_class_id_index" ON "silent_phases" USING btree ("class_id") WHERE "silent_phases"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "water_events_class_id_created_at_index" ON "water_events" USING btree ("class_id","created_at");