import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  jsonRequest,
  readJson,
  routeParams,
  setRouteDb,
} from "@/lib/api/route-test";
import type { Db } from "@/lib/db";
import {
  character,
  event,
  eventCharacter,
  eventPlace,
  place,
  timeline,
  world,
} from "@/lib/db/schema";
import { createTestDb, resetTables } from "@/lib/db/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  const { withTestDb } = await import("@/lib/api/route-test");
  return { ...actual, withDb: withTestDb };
});

const { GET, POST } = await import("./route");

describe("/api/worlds/:worldId/events", () => {
  let db: Db;
  let close: () => Promise<void>;
  let worldId: number;
  let placeId: number;
  let characterId: number;

  beforeAll(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    close = testDb.close;
    setRouteDb(db);
  });

  afterAll(async () => {
    setRouteDb(null);
    await close();
  });

  beforeEach(async () => {
    await resetTables(db);

    const [w] = await db
      .insert(world)
      .values({ name: "테스트 세계관" })
      .returning();
    worldId = w.id;
    await db
      .insert(timeline)
      .values({ worldId, name: "메인 타임라인" })
      .returning();

    const [p] = await db
      .insert(place)
      .values({ worldId, name: "판데모니움", color: "#ff0000", sortKey: 1000n })
      .returning();
    placeId = p.id;

    const [c] = await db
      .insert(character)
      .values({
        worldId,
        name: "에리크토니우스",
        color: "#00ff00",
        sortKey: 1000n,
      })
      .returning();
    characterId = c.id;
  });

  function newEventBody(overrides: Record<string, unknown> = {}) {
    return {
      title: "기억을 남기다",
      displayTime: "고대 - 종말 직후",
      placeIds: [placeId],
      characterIds: [characterId],
      ...overrides,
    };
  }

  it("사건과 공간·인물 연결을 한 번에 만든다", async () => {
    const { status, body } = await readJson(
      await POST(
        jsonRequest("POST", newEventBody()),
        routeParams({ worldId: String(worldId) }),
      ),
    );

    expect(status).toBe(201);
    const created = body.event as { id: number; title: string };
    expect(created.title).toBe("기억을 남기다");

    expect(
      await db
        .select()
        .from(eventPlace)
        .where(eq(eventPlace.eventId, created.id)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(eventCharacter)
        .where(eq(eventCharacter.eventId, created.id)),
    ).toHaveLength(1);
  });

  /**
   * 연결 테이블 삽입이 실패하면 사건 행도 남으면 안 된다. 없는 인물 id를 주면
   * 외래키 제약에 걸리므로, 트랜잭션이 실제로 묶여 있는지 여기서 드러난다.
   */
  it("인물 연결이 실패하면 사건도 남지 않는다", async () => {
    await expect(
      POST(
        jsonRequest("POST", newEventBody({ characterIds: [999999] })),
        routeParams({ worldId: String(worldId) }),
      ),
    ).rejects.toThrow();

    expect(await db.select().from(event)).toHaveLength(0);
    expect(await db.select().from(eventPlace)).toHaveLength(0);
  });

  it("공간을 하나도 안 고르면 400이다", async () => {
    const { status } = await readJson(
      await POST(
        jsonRequest("POST", newEventBody({ placeIds: [] })),
        routeParams({ worldId: String(worldId) }),
      ),
    );

    expect(status).toBe(400);
    expect(await db.select().from(event)).toHaveLength(0);
  });

  it("인물을 하나도 안 고르면 400이다", async () => {
    const { status } = await readJson(
      await POST(
        jsonRequest("POST", newEventBody({ characterIds: [] })),
        routeParams({ worldId: String(worldId) }),
      ),
    );

    expect(status).toBe(400);
  });

  it("title이 없으면 400이다", async () => {
    const { status } = await readJson(
      await POST(
        jsonRequest("POST", newEventBody({ title: undefined })),
        routeParams({ worldId: String(worldId) }),
      ),
    );

    expect(status).toBe(400);
  });

  /**
   * 라우트가 getOrCreateDefaultTimeline을 부르기 전에 세계관 생존을 확인한다.
   * 순서가 뒤집히면 지운 세계관에 타임라인이 새로 생긴다.
   */
  it("지운 세계관에는 사건을 못 만들고 타임라인도 새로 안 생긴다", async () => {
    const [removed] = await db
      .insert(world)
      .values({ name: "지운 세계관", deletedAt: new Date() })
      .returning();

    const { status } = await readJson(
      await POST(
        jsonRequest("POST", newEventBody()),
        routeParams({ worldId: String(removed.id) }),
      ),
    );

    expect(status).toBe(404);
    expect(
      await db.select().from(timeline).where(eq(timeline.worldId, removed.id)),
    ).toHaveLength(0);
  });

  it("작중 시간순(sort_key)으로 목록을 돌려준다", async () => {
    for (const title of ["첫째", "둘째", "셋째"]) {
      await POST(
        jsonRequest("POST", newEventBody({ title })),
        routeParams({ worldId: String(worldId) }),
      );
    }

    const { body } = await readJson(
      await GET(jsonRequest("GET"), routeParams({ worldId: String(worldId) })),
    );
    const titles = (body.events as { title: string }[]).map((e) => e.title);

    expect(titles).toEqual(["첫째", "둘째", "셋째"]);
  });

  it("목록에 공간·인물이 함께 실린다", async () => {
    await POST(
      jsonRequest("POST", newEventBody()),
      routeParams({ worldId: String(worldId) }),
    );

    const { body } = await readJson(
      await GET(jsonRequest("GET"), routeParams({ worldId: String(worldId) })),
    );
    const [first] = body.events as {
      places: { id: number }[];
      characters: { id: number }[];
    }[];

    expect(first.places.map((p) => p.id)).toEqual([placeId]);
    expect(first.characters.map((c) => c.id)).toEqual([characterId]);
  });
});
