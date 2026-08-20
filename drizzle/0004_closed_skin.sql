CREATE TABLE "era" (
	"id" serial PRIMARY KEY NOT NULL,
	"world_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#64748b' NOT NULL,
	"sort_key" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "era_id" bigint;--> statement-breakpoint
ALTER TABLE "era" ADD CONSTRAINT "era_world_id_world_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."world"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "era_world_id_idx" ON "era" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "era_world_id_sort_key_idx" ON "era" USING btree ("world_id","sort_key");--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_era_id_era_id_fk" FOREIGN KEY ("era_id") REFERENCES "public"."era"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- 자유 입력이던 era 문자열을 era 테이블로 옮긴다.
-- 삭제된 사건은 제외한다(지운 사건 때문에 쓰지도 않을 기간이 생기면 안 된다).
-- 순서는 등장 순서를 따르되 1000 단위 간격으로 채번한다.
INSERT INTO "era" ("world_id", "name", "sort_key")
SELECT "world_id", "era", ROW_NUMBER() OVER (PARTITION BY "world_id" ORDER BY MIN("sort_key")) * 1000
FROM "event"
WHERE "era" IS NOT NULL AND btrim("era") <> '' AND "deleted_at" IS NULL
GROUP BY "world_id", "era";--> statement-breakpoint
UPDATE "event" SET "era_id" = "era"."id"
FROM "era"
WHERE "event"."era" = "era"."name"
  AND "event"."world_id" = "era"."world_id"
  AND "event"."deleted_at" IS NULL;
