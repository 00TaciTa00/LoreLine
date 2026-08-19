CREATE TABLE "character" (
	"id" serial PRIMARY KEY NOT NULL,
	"world_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" serial PRIMARY KEY NOT NULL,
	"world_id" bigint NOT NULL,
	"timeline_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"display_time" text NOT NULL,
	"sort_key" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_character" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" bigint NOT NULL,
	"character_id" bigint NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_character_event_id_character_id_key" UNIQUE("event_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "event_place" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" bigint NOT NULL,
	"place_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_place_event_id_place_id_key" UNIQUE("event_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "place" (
	"id" serial PRIMARY KEY NOT NULL,
	"world_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "timeline" (
	"id" serial PRIMARY KEY NOT NULL,
	"world_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "world" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_world_id_world_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."world"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_world_id_world_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."world"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_timeline_id_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timeline"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_character" ADD CONSTRAINT "event_character_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_character" ADD CONSTRAINT "event_character_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_place" ADD CONSTRAINT "event_place_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_place" ADD CONSTRAINT "event_place_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place" ADD CONSTRAINT "place_world_id_world_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."world"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline" ADD CONSTRAINT "timeline_world_id_world_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."world"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_world_id_idx" ON "character" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "event_world_id_sort_key_idx" ON "event" USING btree ("world_id","sort_key");--> statement-breakpoint
CREATE INDEX "event_timeline_id_sort_key_idx" ON "event" USING btree ("timeline_id","sort_key");--> statement-breakpoint
CREATE INDEX "event_character_event_id_idx" ON "event_character" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_character_character_id_idx" ON "event_character" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "event_place_event_id_idx" ON "event_place" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_place_place_id_idx" ON "event_place" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "place_world_id_idx" ON "place" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "timeline_world_id_idx" ON "timeline" USING btree ("world_id");