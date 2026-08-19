import { asc, eq } from "drizzle-orm";

import type { Db } from "./index";
import type { OrderableTable } from "./ordering";
import { character, place } from "./schema";

/**
 * 공간·인물을 순서 있는 목록으로 다루기 위한 어댑터.
 *
 * 삭제된 항목도 조회에 포함한다. 빼고 채번하면 삭제된 항목이 차지한 sort_key와
 * 겹칠 수 있고, 나중에 복구했을 때 순서가 어긋난다.
 */
export const placeOrder: OrderableTable = {
  list: (db: Db, worldId: number) =>
    db
      .select({ id: place.id, sortKey: place.sortKey })
      .from(place)
      .where(eq(place.worldId, worldId))
      .orderBy(asc(place.sortKey)),

  updateSortKey: async (db: Db, id: number, sortKey: bigint) => {
    await db.update(place).set({ sortKey }).where(eq(place.id, id));
  },
};

export const characterOrder: OrderableTable = {
  list: (db: Db, worldId: number) =>
    db
      .select({ id: character.id, sortKey: character.sortKey })
      .from(character)
      .where(eq(character.worldId, worldId))
      .orderBy(asc(character.sortKey)),

  updateSortKey: async (db: Db, id: number, sortKey: bigint) => {
    await db.update(character).set({ sortKey }).where(eq(character.id, id));
  },
};
