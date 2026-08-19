ALTER TABLE "character" ADD COLUMN "color" text DEFAULT '#64748b' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "color" text DEFAULT '#64748b' NOT NULL;