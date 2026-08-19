import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Db } from "./index";
import { placeOrder } from "./orderable-tables";
import { rebalance, resolveSortKey } from "./ordering";
import { place, world } from "./schema";
import { INITIAL_GAP } from "./sort-key";
import { createTestDb } from "./test-db";

/**
 * 공간·인물 목록의 순서 로직 검증. 사건과 달리 세계관 단위로 정렬되므로
 * 조회 범위가 맞는지, 다른 세계관을 건드리지 않는지가 핵심이다.
 */
describe("ordering (공간 기준, 실제 DB)", () => {
  let db: Db;
  let close: () => Promise<void>;
  let worldId: number;

  beforeEach(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    close = testDb.close;

    const [w] = await db
      .insert(world)
      .values({ name: "테스트 세계관" })
      .returning({ id: world.id });
    worldId = w.id;
  });

  afterEach(async () => {
    await close();
  });

  async function addPlace(name: string, sortKey: bigint): Promise<number> {
    const [row] = await db
      .insert(place)
      .values({ worldId, name, sortKey })
      .returning({ id: place.id });
    return row.id;
  }

  async function order(): Promise<[string, bigint][]> {
    const rows = await db
      .select({ name: place.name, sortKey: place.sortKey })
      .from(place)
      .where(eq(place.worldId, worldId))
      .orderBy(asc(place.sortKey));
    return rows.map((r) => [r.name, r.sortKey]);
  }

  describe("resolveSortKey", () => {
    it("빈 목록의 end는 INITIAL_GAP", async () => {
      const key = await resolveSortKey(db, worldId, placeOrder, { kind: "end" });
      expect(key).toBe(INITIAL_GAP);
    });

    it("end는 마지막 뒤에 온다", async () => {
      await addPlace("A", 1000n);
      await addPlace("B", 2000n);

      const key = await resolveSortKey(db, worldId, placeOrder, { kind: "end" });
      expect(key).toBe(3000n);
    });

    it("first는 첫 항목 앞에 온다", async () => {
      await addPlace("A", 1000n);

      const key = await resolveSortKey(db, worldId, placeOrder, {
        kind: "first",
      });
      expect(key).toBeLessThan(1000n);
    });

    it("after는 지정한 항목과 그 다음 사이에 온다", async () => {
      const aId = await addPlace("A", 1000n);
      await addPlace("B", 2000n);

      const key = await resolveSortKey(db, worldId, placeOrder, {
        kind: "after",
        eventId: aId,
      });
      expect(key).toBeGreaterThan(1000n);
      expect(key).toBeLessThan(2000n);
    });

    it("excludeId로 지정한 항목은 이웃 계산에서 빠진다", async () => {
      const aId = await addPlace("A", 1000n);
      const bId = await addPlace("B", 1001n);
      await addPlace("C", 5000n);

      const key = await resolveSortKey(
        db,
        worldId,
        placeOrder,
        { kind: "after", eventId: aId },
        bId,
      );

      expect(key).toBeGreaterThan(1000n);
      expect(key).toBeLessThan(5000n);
    });

    it("간격이 소진되면 재정렬 후 자리를 내준다", async () => {
      const aId = await addPlace("A", 1000n);
      await addPlace("B", 1001n);

      const key = await resolveSortKey(db, worldId, placeOrder, {
        kind: "after",
        eventId: aId,
      });

      const after = await order();
      expect(after.map(([n]) => n)).toEqual(["A", "B"]);
      expect(after[0][1]).toBe(INITIAL_GAP);
      expect(key).toBeGreaterThan(after[0][1]);
      expect(key).toBeLessThan(after[1][1]);
    });

    it("다른 세계관의 항목은 순서 계산에 끼어들지 않는다", async () => {
      const [other] = await db
        .insert(world)
        .values({ name: "다른 세계관" })
        .returning({ id: world.id });
      await db
        .insert(place)
        .values({ worldId: other.id, name: "남의 공간", sortKey: 999999n });

      await addPlace("A", 1000n);

      const key = await resolveSortKey(db, worldId, placeOrder, { kind: "end" });
      // 남의 세계관 999999가 아니라 우리 A(1000) 기준이어야 한다.
      expect(key).toBe(2000n);
    });
  });

  describe("rebalance", () => {
    it("순서를 유지한 채 간격을 다시 벌린다", async () => {
      await addPlace("A", 1n);
      await addPlace("B", 2n);
      await addPlace("C", 900n);

      await rebalance(db, worldId, placeOrder);

      expect(await order()).toEqual([
        ["A", INITIAL_GAP],
        ["B", INITIAL_GAP * 2n],
        ["C", INITIAL_GAP * 3n],
      ]);
    });

    it("다른 세계관은 건드리지 않는다", async () => {
      const [other] = await db
        .insert(world)
        .values({ name: "다른 세계관" })
        .returning({ id: world.id });
      const [untouched] = await db
        .insert(place)
        .values({ worldId: other.id, name: "남의 공간", sortKey: 7n })
        .returning({ id: place.id });

      await addPlace("A", 5n);
      await rebalance(db, worldId, placeOrder);

      const [row] = await db
        .select({ sortKey: place.sortKey })
        .from(place)
        .where(eq(place.id, untouched.id));
      expect(row.sortKey).toBe(7n);
    });
  });
});
