CREATE TABLE "collection_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"cooperative_id" uuid,
	"status" text DEFAULT 'planned',
	"total_distance_km" double precision,
	"total_duration_seconds" double precision,
	"scheduled_date" date,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cooperatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cnpj" text,
	"phone" text,
	"address" text,
	"instagram" text,
	"website" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cooperatives_name_unique" UNIQUE("name"),
	CONSTRAINT "cooperatives_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "route_streets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"street_id" integer NOT NULL,
	"stop_order" integer NOT NULL,
	"direction" text DEFAULT 'forward',
	"distance_from_previous_km" double precision,
	"duration_from_previous_seconds" double precision
);
--> statement-breakpoint
CREATE TABLE "streets" (
	"id" serial PRIMARY KEY NOT NULL,
	"osm_id" bigint,
	"name" text,
	"geom" text,
	"source" integer,
	"target" integer,
	"cost" double precision,
	"reverse_cost" double precision,
	"length_km" double precision,
	"requires_collection" boolean DEFAULT false,
	"oneway" boolean DEFAULT false,
	"highway_type" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cooperative_id" uuid,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"location" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate" text,
	"model" text,
	"color" text,
	"cooperative_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
ALTER TABLE "collection_routes" ADD CONSTRAINT "collection_routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_routes" ADD CONSTRAINT "collection_routes_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_streets" ADD CONSTRAINT "route_streets_route_id_collection_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."collection_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_streets" ADD CONSTRAINT "route_streets_street_id_streets_id_fk" FOREIGN KEY ("street_id") REFERENCES "public"."streets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_positions" ADD CONSTRAINT "vehicle_positions_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE no action ON UPDATE no action;