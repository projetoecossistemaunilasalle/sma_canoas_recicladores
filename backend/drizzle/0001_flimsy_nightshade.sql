ALTER TABLE "publications" ADD COLUMN "address" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "phone" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "weekday_hours" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "saturday_hours" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "sunday_hours" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "important_photo_url" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "important_photo_description" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "updated_photo_url" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "updated_photo_description" text;
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "photo_updated_at" date;
--> statement-breakpoint

ALTER TABLE "streets"
ALTER COLUMN "geom" SET DATA TYPE geometry(LineString,4326);
--> statement-breakpoint

ALTER TABLE "streets"
ALTER COLUMN "geom" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "vehicle_positions"
ALTER COLUMN "location" SET DATA TYPE geometry(Point,4326);
--> statement-breakpoint

ALTER TABLE "vehicle_positions"
ALTER COLUMN "location" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "collection_routes"
ADD COLUMN "days_of_week" text[];
--> statement-breakpoint

ALTER TABLE "collection_routes"
ADD COLUMN "shift" text;
--> statement-breakpoint

ALTER TABLE "collection_routes"
ADD COLUMN "start_time" time;
--> statement-breakpoint

ALTER TABLE "route_streets"
ADD COLUMN "is_stop" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

ALTER TABLE "publications"
ADD CONSTRAINT "publications_cooperative_id_cooperatives_id_fk"
FOREIGN KEY ("cooperative_id")
REFERENCES "public"."cooperatives"("id")
ON DELETE no action
ON UPDATE no action;