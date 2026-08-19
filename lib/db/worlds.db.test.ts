import { and, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Db } from "./index";
import {
  character,
  event,
  eventCharacter,
  eventPlace,
  place,
  timeline,
  world,
} from "./schema";
import { createTestDb } from "./test-db";
import { isWorldAlive, softDeleteWorld } from "./worlds";

/**
 * 세계관 소프트 삭제가 하위 데이터까지 일관되게 정리하는지 검증한다.
 * (이전에는 세계관만 지워져서, GET /worlds/:id는 404인데
 *  GET /worlds/:id/places는 여전히 공간을 돌려주는 상태였다.)
 */
describe("softDeleteWorld", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    close = testDb.close;
  });

  afterEach(async () => {
    await close();
  });

  /** 세계관 하나와 그 하위 데이터 전체를 만든다. */
  async function seedWorld(name: string) {
    const [w] = await db
      .insert(world)
      .values({ name })
      .returning({ id: world.id });
    const [t] = await db
      .insert(timeline)
      .values({ worldId: w.id, name: "메인" })
      .returning({ id: timeline.id });
    const [p] = await db
      .insert(place)
      .values({ worldId: w.id, name: "공간" })
      .returning({ id: place.id });
    const [c] = await db
      .insert(character)
      .values({ worldId: w.id, name: "인물" })
      .returning({ id: character.id });
    const [e] = await db
      .insert(event)
      .values({
        worldId: w.id,
        timelineId: t.id,
        title: "사건",
        displayTime: "t",
        sortKey: 1000n,
      })
      .returning({ id: event.id });
    await db.insert(eventPlace).values({ eventId: e.id, placeId: p.id });
    await db
      .insert(eventCharacter)
      .values({ eventId: e.id, characterId: c.id });

    return { worldId: w.id, timelineId: t.id, placeId: p.id, characterId: c.id, eventId: e.id };
  }

  /** 삭제되지 않은(살아있는) 하위 데이터 건수 */
  async function liveCounts(worldId: number) {
    const live = async (table: typeof place | typeof character | typeof event | typeof timeline) =>
      (
        await db
          .select({ id: table.id })
          .from(table)
          .where(and(eq(table.worldId, worldId), isNull(table.deletedAt)))
      ).length;

    return {
      timelines: await live(timeline),
      events: await live(event),
      places: await live(place),
      characters: await live(character),
    };
  }

  it("세계관과 하위 데이터를 모두 소프트 삭제한다", async () => {
    const { worldId } = await seedWorld("대상 세계관");

    expect(await liveCounts(worldId)).toEqual({
      timelines: 1,
      events: 1,
      places: 1,
      characters: 1,
    });

    const deleted = await softDeleteWorld(db, worldId);
    expect(deleted).not.toBeNull();

    expect(await liveCounts(worldId)).toEqual({
      timelines: 0,
      events: 0,
      places: 0,
      characters: 0,
    });
  });

  it("행을 물리적으로 지우지 않는다 (소프트 삭제)", async () => {
    const { worldId, placeId } = await seedWorld("보존 확인");
    await softDeleteWorld(db, worldId);

    const rows = await db.select().from(place).where(eq(place.id, placeId));
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("조인 테이블의 연결은 보존한다", async () => {
    // 소프트 삭제에서는 복구를 위해 연결 정보를 남겨야 한다.
    const { worldId, eventId } = await seedWorld("연결 보존");
    await softDeleteWorld(db, worldId);

    const places = await db
      .select()
      .from(eventPlace)
      .where(eq(eventPlace.eventId, eventId));
    const chars = await db
      .select()
      .from(eventCharacter)
      .where(eq(eventCharacter.eventId, eventId));

    expect(places).toHaveLength(1);
    expect(chars).toHaveLength(1);
  });

  it("다른 세계관의 데이터는 건드리지 않는다", async () => {
    const target = await seedWorld("삭제 대상");
    const other = await seedWorld("남아야 할 세계관");

    await softDeleteWorld(db, target.worldId);

    expect(await liveCounts(other.worldId)).toEqual({
      timelines: 1,
      events: 1,
      places: 1,
      characters: 1,
    });

    const [otherWorld] = await db
      .select()
      .from(world)
      .where(eq(world.id, other.worldId));
    expect(otherWorld.deletedAt).toBeNull();
  });

  it("이미 지워진 하위 데이터의 삭제 시각은 덮어쓰지 않는다", async () => {
    const { worldId, placeId } = await seedWorld("선삭제 보존");

    const earlier = new Date("2020-01-01T00:00:00Z");
    await db
      .update(place)
      .set({ deletedAt: earlier })
      .where(eq(place.id, placeId));

    await softDeleteWorld(db, worldId);

    const [row] = await db.select().from(place).where(eq(place.id, placeId));
    expect(row.deletedAt?.toISOString()).toBe(earlier.toISOString());
  });

  it("없는 세계관이면 null을 반환한다", async () => {
    expect(await softDeleteWorld(db, 99999)).toBeNull();
  });

  it("이미 삭제된 세계관을 다시 지우면 null을 반환한다", async () => {
    const { worldId } = await seedWorld("중복 삭제");

    expect(await softDeleteWorld(db, worldId)).not.toBeNull();
    expect(await softDeleteWorld(db, worldId)).toBeNull();
  });

  describe("isWorldAlive", () => {
    it("살아있는 세계관은 true", async () => {
      const { worldId } = await seedWorld("생존");
      expect(await isWorldAlive(db, worldId)).toBe(true);
    });

    it("삭제된 세계관은 false", async () => {
      const { worldId } = await seedWorld("삭제됨");
      await softDeleteWorld(db, worldId);
      expect(await isWorldAlive(db, worldId)).toBe(false);
    });

    it("없는 id는 false", async () => {
      expect(await isWorldAlive(db, 99999)).toBe(false);
    });

    it("숫자가 아닌 id(NaN)는 DB를 타지 않고 false", async () => {
      // 라우트에서 Number("abc") = NaN이 넘어올 수 있다.
      expect(await isWorldAlive(db, Number("abc"))).toBe(false);
    });
  });
});
