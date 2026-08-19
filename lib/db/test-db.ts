import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { Db } from "./index";
import * as schema from "./schema";
import { event, timeline, world } from "./schema";

/**
 * 테스트 전용 인메모리 Postgres.
 *
 * DB를 타는 로직(rebalanceTimeline, resolveSortKeyForInsert)은 순수 함수가
 * 아니라 실제 트랜잭션·정렬 동작을 확인해야 하므로, 네트워크 없이 돌릴 수 있는
 * PGlite에 실제 마이그레이션(drizzle/)을 적용해 검증한다.
 *
 * 프로덕션은 Neon(WebSocket) 드라이버를 쓰고 여기서는 PGlite 드라이버를 쓰는데,
 * 두 드라이버의 Drizzle 타입이 달라 `Db`로 캐스팅한다. 테스트 대상 함수들이
 * 쓰는 API(select/insert/update/transaction)는 양쪽 모두 동일하게 제공한다.
 */
export type TestDb = {
  db: Db;
  close: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "./drizzle" });

  return {
    db: db as unknown as Db,
    close: () => client.close(),
  };
}

/** 테스트용 World + Timeline을 만들고 timelineId를 돌려준다. */
export async function seedTimeline(db: Db): Promise<number> {
  const [createdWorld] = await db
    .insert(world)
    .values({ name: "테스트 세계관" })
    .returning({ id: world.id });

  const [createdTimeline] = await db
    .insert(timeline)
    .values({ worldId: createdWorld.id, name: "메인 타임라인" })
    .returning({ id: timeline.id });

  return createdTimeline.id;
}

/** sort_key를 직접 지정해 사건을 만든다(경계 조건을 재현하기 위함). */
export async function seedEvent(
  db: Db,
  timelineId: number,
  title: string,
  sortKey: bigint,
): Promise<number> {
  const [row] = await db
    .select({ worldId: timeline.worldId })
    .from(timeline)
    .where(eq(timeline.id, timelineId));

  const [created] = await db
    .insert(event)
    .values({
      worldId: row.worldId,
      timelineId,
      title,
      displayTime: title,
      sortKey,
    })
    .returning({ id: event.id });

  return created.id;
}
