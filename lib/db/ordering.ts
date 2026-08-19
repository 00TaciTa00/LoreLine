import type { Db } from "./index";
import {
  INITIAL_GAP,
  appendSortKey,
  insertSortKey,
  type InsertTarget,
} from "./sort-key";

/**
 * 세계관 안에서 순서를 갖는 목록(공간·인물)의 재정렬.
 *
 * Event는 타임라인 단위로 정렬되지만 공간·인물은 세계관 단위라 조회 조건이
 * 다르다. 채번 계산 자체는 같으므로 `sort-key.ts`의 순수 함수를 그대로 쓰고,
 * 테이블마다 다른 부분(조회·갱신)만 어댑터로 받는다.
 */
export type OrderableRow = { id: number; sortKey: bigint };

export type OrderableTable = {
  /** 세계관의 항목을 sort_key 오름차순으로 (삭제된 것 포함) */
  list: (db: Db, worldId: number) => Promise<OrderableRow[]>;
  updateSortKey: (db: Db, id: number, sortKey: bigint) => Promise<void>;
};

/**
 * 순서를 그대로 유지한 채 sort_key를 INITIAL_GAP 간격으로 다시 매긴다.
 * 중간 삽입이 반복돼 간격이 소진됐을 때만 호출된다.
 */
export async function rebalance(
  db: Db,
  worldId: number,
  table: OrderableTable,
): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = await table.list(tx, worldId);
    for (let i = 0; i < rows.length; i++) {
      await table.updateSortKey(tx, rows[i].id, INITIAL_GAP * BigInt(i + 1));
    }
  });
}

/**
 * target 위치에 놓을 sort_key를 계산한다. 간격이 부족하면 재정렬 후 다시 센다.
 *
 * @param excludeId 이동하는 항목 자신 (이웃 계산에서 빼야 한다)
 */
export async function resolveSortKey(
  db: Db,
  worldId: number,
  table: OrderableTable,
  target: InsertTarget,
  excludeId?: number,
): Promise<bigint> {
  const siblings = (await table.list(db, worldId)).filter(
    (row) => row.id !== excludeId,
  );

  if (target.kind === "end") {
    return appendSortKey(siblings.at(-1)?.sortKey ?? null);
  }

  const [before, after] =
    target.kind === "first"
      ? ([null, siblings[0]?.sortKey ?? null] as const)
      : (() => {
          const idx = siblings.findIndex((row) => row.id === target.eventId);
          return [
            siblings[idx]?.sortKey ?? null,
            siblings[idx + 1]?.sortKey ?? null,
          ] as const;
        })();

  const result = insertSortKey(before, after);
  if (!result.needsRebalance) {
    return result.sortKey;
  }

  await rebalance(db, worldId, table);
  return resolveSortKey(db, worldId, table, target, excludeId);
}
