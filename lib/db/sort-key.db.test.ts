import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Db } from "./index";
import { event } from "./schema";
import {
  INITIAL_GAP,
  rebalanceTimeline,
  resolveSortKeyForInsert,
} from "./sort-key";
import { createTestDb, seedEvent, seedTimeline } from "./test-db";

/**
 * DB를 실제로 타는 정렬 로직 검증. 순수 함수 테스트(sort-key.test.ts)와 달리
 * 트랜잭션·정렬·재채번이 진짜로 동작하는지 본다.
 *
 * 특히 rebalanceTimeline은 간격이 소진되어야 호출되는 경로라 지금까지
 * 한 번도 실행된 적이 없었다. 아래 테스트가 그 경로를 강제로 재현한다.
 */
describe("rebalanceTimeline / resolveSortKeyForInsert (실제 DB)", () => {
  let db: Db;
  let close: () => Promise<void>;
  let timelineId: number;

  beforeEach(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    close = testDb.close;
    timelineId = await seedTimeline(db);
  });

  afterEach(async () => {
    await close();
  });

  /** 타임라인의 사건을 sort_key 순으로 (제목, 키) 배열로 돌려준다. */
  async function order(): Promise<[string, bigint][]> {
    const rows = await db
      .select({ title: event.title, sortKey: event.sortKey })
      .from(event)
      .where(eq(event.timelineId, timelineId))
      .orderBy(asc(event.sortKey));
    return rows.map((r) => [r.title, r.sortKey]);
  }

  describe("rebalanceTimeline", () => {
    it("빈 타임라인에서도 실패하지 않는다", async () => {
      await rebalanceTimeline(db, timelineId);
      expect(await order()).toEqual([]);
    });

    it("순서를 보존한 채 INITIAL_GAP 간격으로 재채번한다", async () => {
      await seedEvent(db, timelineId, "A", 1n);
      await seedEvent(db, timelineId, "B", 2n);
      await seedEvent(db, timelineId, "C", 900n);

      await rebalanceTimeline(db, timelineId);

      expect(await order()).toEqual([
        ["A", INITIAL_GAP],
        ["B", INITIAL_GAP * 2n],
        ["C", INITIAL_GAP * 3n],
      ]);
    });

    it("음수 sort_key도 순서를 유지하며 재채번한다", async () => {
      // 맨 앞 삽입을 반복하면 sort_key가 음수 영역으로 내려간다.
      await seedEvent(db, timelineId, "앞", -3000n);
      await seedEvent(db, timelineId, "중간", 0n);
      await seedEvent(db, timelineId, "뒤", 1000n);

      await rebalanceTimeline(db, timelineId);

      expect((await order()).map(([t]) => t)).toEqual(["앞", "중간", "뒤"]);
      expect((await order()).every(([, k]) => k > 0n)).toBe(true);
    });

    it("다른 타임라인의 사건은 건드리지 않는다", async () => {
      const otherTimelineId = await seedTimeline(db);
      await seedEvent(db, timelineId, "대상", 5n);
      const untouchedId = await seedEvent(db, otherTimelineId, "타 타임라인", 7n);

      await rebalanceTimeline(db, timelineId);

      const [untouched] = await db
        .select({ sortKey: event.sortKey })
        .from(event)
        .where(eq(event.id, untouchedId));
      expect(untouched.sortKey).toBe(7n);
    });
  });

  describe("resolveSortKeyForInsert", () => {
    it("빈 타임라인의 end는 INITIAL_GAP이다", async () => {
      const key = await resolveSortKeyForInsert(db, timelineId, { kind: "end" });
      expect(key).toBe(INITIAL_GAP);
    });

    it("end는 마지막 사건 뒤에 온다", async () => {
      await seedEvent(db, timelineId, "A", 1000n);
      await seedEvent(db, timelineId, "B", 2000n);

      const key = await resolveSortKeyForInsert(db, timelineId, { kind: "end" });
      expect(key).toBe(3000n);
    });

    it("first는 첫 사건 앞에 온다", async () => {
      await seedEvent(db, timelineId, "A", 1000n);

      const key = await resolveSortKeyForInsert(db, timelineId, {
        kind: "first",
      });
      expect(key).toBeLessThan(1000n);
    });

    it("after는 지정한 사건과 그 다음 사건 사이에 온다", async () => {
      const aId = await seedEvent(db, timelineId, "A", 1000n);
      await seedEvent(db, timelineId, "B", 2000n);

      const key = await resolveSortKeyForInsert(db, timelineId, {
        kind: "after",
        eventId: aId,
      });
      expect(key).toBeGreaterThan(1000n);
      expect(key).toBeLessThan(2000n);
    });

    it("excludeEventId로 지정한 사건은 시퀀스에서 빠진다", async () => {
      // B를 A 뒤로 옮길 때, B 자신이 이웃으로 잡히면 안 된다.
      const aId = await seedEvent(db, timelineId, "A", 1000n);
      const bId = await seedEvent(db, timelineId, "B", 1001n);
      await seedEvent(db, timelineId, "C", 5000n);

      const key = await resolveSortKeyForInsert(
        db,
        timelineId,
        { kind: "after", eventId: aId },
        bId,
      );

      // B가 빠지면 A(1000)와 C(5000) 사이라 여유가 충분하다.
      expect(key).toBeGreaterThan(1000n);
      expect(key).toBeLessThan(5000n);
    });

    // --- 경계: 간격 소진 -> 재정렬 경로 -------------------------------------

    it("간격이 소진되면 재정렬 후 삽입 가능한 키를 돌려준다", async () => {
      // A와 B 사이에 정수 여유가 없다(간격 1). 재정렬 없이는 삽입 불가.
      const aId = await seedEvent(db, timelineId, "A", 1000n);
      await seedEvent(db, timelineId, "B", 1001n);

      const key = await resolveSortKeyForInsert(db, timelineId, {
        kind: "after",
        eventId: aId,
      });

      // 재정렬이 일어나 A, B가 넓은 간격으로 다시 채번된다.
      const after = await order();
      expect(after.map(([t]) => t)).toEqual(["A", "B"]);
      expect(after[0][1]).toBe(INITIAL_GAP);
      expect(after[1][1]).toBe(INITIAL_GAP * 2n);

      // 돌려받은 키는 재정렬된 A와 B 사이에 실제로 들어갈 수 있어야 한다.
      expect(key).toBeGreaterThan(after[0][1]);
      expect(key).toBeLessThan(after[1][1]);
    });

    it("간격이 정확히 MIN_GAP일 때도 재정렬한다", async () => {
      const aId = await seedEvent(db, timelineId, "A", 1000n);
      await seedEvent(db, timelineId, "B", 1002n);

      const key = await resolveSortKeyForInsert(db, timelineId, {
        kind: "after",
        eventId: aId,
      });

      const after = await order();
      expect(after[0][1]).toBe(INITIAL_GAP);
      expect(key).toBeGreaterThan(after[0][1]);
      expect(key).toBeLessThan(after[1][1]);
    });

    it("재정렬을 유발하는 삽입을 반복해도 순서가 보존된다", async () => {
      // 같은 지점에 계속 끼워 넣어 간격을 반복적으로 소진시킨다.
      const aId = await seedEvent(db, timelineId, "A", 1000n);
      await seedEvent(db, timelineId, "Z", 1001n);

      for (let i = 0; i < 12; i++) {
        const key = await resolveSortKeyForInsert(db, timelineId, {
          kind: "after",
          eventId: aId,
        });
        await db.insert(event).values({
          worldId: (
            await db
              .select({ worldId: event.worldId })
              .from(event)
              .where(eq(event.id, aId))
          )[0].worldId,
          timelineId,
          title: `삽입${i}`,
          displayTime: `삽입${i}`,
          sortKey: key,
        });
      }

      const titles = (await order()).map(([t]) => t);
      // A 바로 뒤에 나중에 넣은 것부터 쌓이고, Z는 항상 마지막이다.
      expect(titles[0]).toBe("A");
      expect(titles.at(-1)).toBe("Z");
      expect(titles).toHaveLength(14);

      // 키가 모두 서로 다르고 오름차순이어야 한다.
      const keys = (await order()).map(([, k]) => k);
      expect(new Set(keys.map(String)).size).toBe(keys.length);
      for (let i = 1; i < keys.length; i++) {
        expect(keys[i]).toBeGreaterThan(keys[i - 1]);
      }
    });
  });
});
