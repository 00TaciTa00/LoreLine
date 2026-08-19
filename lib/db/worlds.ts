import { and, eq, isNull } from "drizzle-orm";

import type { Db } from "./index";
import { character, event, place, timeline, world } from "./schema";

type WorldRow = typeof world.$inferSelect;

/**
 * 세계관이 존재하고 아직 삭제되지 않았는지 확인한다.
 *
 * 하위 데이터를 만드는 API(POST places/characters/events)는 world_id를 그대로
 * 받아 쓰기 때문에, 이 확인이 없으면 이미 삭제된 세계관에도 새 공간·인물·사건을
 * 만들 수 있다. 만들어진 데이터는 어느 목록에도 안 나타나면서 DB에만 쌓인다.
 */
export async function isWorldAlive(
  db: Db,
  worldId: number,
): Promise<boolean> {
  if (!Number.isInteger(worldId)) return false;

  const [found] = await db
    .select({ id: world.id })
    .from(world)
    .where(and(eq(world.id, worldId), isNull(world.deletedAt)));

  return found !== undefined;
}

/**
 * 세계관을 소프트 삭제하면서 하위 엔티티(Timeline/Event/Place/Character)에도
 * 같은 `deleted_at`을 찍는다.
 *
 * 왜 필요한가: 목록/조회 API는 각 테이블의 `deleted_at`만 보고 필터링한다.
 * 세계관만 지우면 하위 데이터는 살아 있어서 `GET /api/worlds/:id`는 404인데
 * `GET /api/worlds/:id/places`는 여전히 공간을 돌려주는 상태가 된다.
 * 스펙의 "world_id 단위 데이터 격리 + 핵심 엔티티는 소프트 삭제" 원칙에 맞춰
 * 한 트랜잭션에서 함께 처리한다.
 *
 * 조인 테이블(event_character/event_place)은 건드리지 않는다. 스펙상 조인 행은
 * 본체가 하드 삭제될 때만 CASCADE로 사라지고, 소프트 삭제에서는 연결 정보를
 * 보존해야 복구가 가능하기 때문이다.
 *
 * 이미 개별적으로 삭제된 하위 데이터는 `deleted_at`을 덮어쓰지 않는다.
 *
 * NOTE: 복구(휴지통) 기능을 넣게 되면, 세계관 삭제로 함께 지워진 것과 사용자가
 * 따로 지운 것을 구분할 수단이 필요하다(현재는 타임스탬프뿐이라 구분 불가).
 *
 * @returns 삭제된 세계관 행. 없거나 이미 삭제됐으면 null.
 */
export async function softDeleteWorld(
  db: Db,
  worldId: number,
): Promise<WorldRow | null> {
  return db.transaction(async (tx) => {
    const [deletedWorld] = await tx
      .update(world)
      .set({ deletedAt: new Date() })
      .where(and(eq(world.id, worldId), isNull(world.deletedAt)))
      .returning();

    if (!deletedWorld) return null;

    const deletedAt = deletedWorld.deletedAt;

    await tx
      .update(timeline)
      .set({ deletedAt })
      .where(and(eq(timeline.worldId, worldId), isNull(timeline.deletedAt)));

    await tx
      .update(event)
      .set({ deletedAt })
      .where(and(eq(event.worldId, worldId), isNull(event.deletedAt)));

    await tx
      .update(place)
      .set({ deletedAt })
      .where(and(eq(place.worldId, worldId), isNull(place.deletedAt)));

    await tx
      .update(character)
      .set({ deletedAt })
      .where(and(eq(character.worldId, worldId), isNull(character.deletedAt)));

    return deletedWorld;
  });
}
