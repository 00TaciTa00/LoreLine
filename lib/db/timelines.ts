import { and, asc, eq, isNull } from "drizzle-orm";

import type { Db } from "./index";
import { timeline } from "./schema";

/**
 * 이번 이터레이션의 UI는 Timeline을 별도로 노출하지 않고, 세계관마다
 * 하나의 "메인 타임라인"을 암묵적으로 사용한다(Event.timeline_id는 NOT NULL
 * 이므로 스키마상 반드시 필요). 여러 타임라인 관리 UI는 이후 확장 여지로 남겨둔다.
 */
export const DEFAULT_TIMELINE_NAME = "메인 타임라인";

export async function getOrCreateDefaultTimeline(
  db: Db,
  worldId: number,
): Promise<number> {
  const [existing] = await db
    .select({ id: timeline.id })
    .from(timeline)
    .where(and(eq(timeline.worldId, worldId), isNull(timeline.deletedAt)))
    .orderBy(asc(timeline.id))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(timeline)
    .values({ worldId, name: DEFAULT_TIMELINE_NAME })
    .returning({ id: timeline.id });

  return created.id;
}
