CREATE TABLE "plant_classes" (
	"plant_id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plant_classes_classId_unique" UNIQUE("class_id")
);
--> statement-breakpoint
CREATE TABLE "sensor_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sensor_id" text NOT NULL,
	"plant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"value" double precision NOT NULL,
	"unit" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sensor_readings_sensor_id_recorded_at_index" ON "sensor_readings" USING btree ("sensor_id","recorded_at");--> statement-breakpoint
CREATE INDEX "sensor_readings_class_id_recorded_at_index" ON "sensor_readings" USING btree ("class_id","recorded_at");