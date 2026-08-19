ALTER TABLE "character" ADD COLUMN "sort_key" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "sort_key" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "character_world_id_sort_key_idx" ON "character" USING btree ("world_id","sort_key");--> statement-breakpoint
CREATE INDEX "place_world_id_sort_key_idx" ON "place" USING btree ("world_id","sort_key");--> statement-breakpoint
-- 기존 행을 그대로 두면 sort_key가 모두 0이라 순서가 뒤섞인다.
-- 지금까지 목록이 사실상 id 순으로 보였으므로 그 순서를 그대로 옮겨 담는다.
-- 1000 단위 간격은 Event.sort_key와 같은 채번 전략을 따른 것이다.
UPDATE "character" SET "sort_key" = "id" * 1000;--> statement-breakpoint
UPDATE "place" SET "sort_key" = "id" * 1000;
