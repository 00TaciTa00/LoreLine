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
  rawRequest,
  readJson,
  routeParams,
  setRouteDb,
} from "@/lib/api/route-test";
import type { Db } from "@/lib/db";
import {
  character,
  era,
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

const characterList = await import("./characters/route");
const characterItem = await import("./characters/[characterId]/route");
const placeList = await import("./places/route");
const placeItem = await import("./places/[placeId]/route");
const eraList = await import("./eras/route");
const eraItem = await import("./eras/[eraId]/route");

/**
 * 인물·공간·시대는 스키마도 라우트도 같은 모양이다(name/description/color/
 * sort_key + 소프트 삭제). 그래서 같은 검사를 셋에 모두 돌린다.
 *
 * #28에서 이 라우트들을 하나로 합칠 예정인데, 그때 셋이 함께 지켜져야 하는
 * 동작이 바로 여기 적힌 것들이다.
 */
const entities = [
  {
    label: "인물",
    table: character,
    listKey: "characters",
    itemKey: "character",
    list: characterList,
    item: characterItem,
    linkEvent: async (db: Db, eventId: number, itemId: number) => {
      await db.insert(eventCharacter).values({ eventId, characterId: itemId });
    },
  },
  {
    label: "공간",
    table: place,
    listKey: "places",
    itemKey: "place",
    list: placeList,
    item: placeItem,
    linkEvent: async (db: Db, eventId: number, itemId: number) => {
      await db.insert(eventPlace).values({ eventId, placeId: itemId });
    },
  },
  {
    label: "시대",
    table: era,
    listKey: "eras",
    itemKey: "era",
    list: eraList,
    item: eraItem,
    linkEvent: async (db: Db, eventId: number, itemId: number) => {
      await db
        .update(event)
        .set({ eraId: itemId })
        .where(eq(event.id, eventId));
    },
  },
] as const;

describe.each(entities)(
  "/api/worlds/:worldId/$listKey ($label)",
  ({ table, listKey, itemKey, list, item, linkEvent }) => {
    let db: Db;
    let close: () => Promise<void>;
    let worldId: number;

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
    });

    /** 라우트를 통해 하나 만들고 id를 돌려준다. */
    async function create(body: Record<string, unknown>) {
      const response = await list.POST(
        jsonRequest("POST", body),
        routeParams({ worldId: String(worldId) }),
      );
      const { status, body: json } = await readJson(response);
      return { status, item: json[itemKey] as { id: number; name: string } };
    }

    /**
     * 세 단건 라우트의 params 타입이 서로 다르다(characterId/placeId/eraId).
     * 하나만 채우면 나머지 둘의 타입에 걸리므로 셋 다 같은 값으로 넣는다.
     * 핸들러는 자기 것만 읽으므로 동작에는 영향이 없다.
     */
    function itemParams(id: number) {
      const value = String(id);
      return routeParams({
        worldId: String(worldId),
        characterId: value,
        placeId: value,
        eraId: value,
      });
    }

    it("만들면 201이고 목록에 실린다", async () => {
      const created = await create({ name: "첫 항목" });
      expect(created.status).toBe(201);

      const { body } = await readJson(
        await list.GET(
          jsonRequest("GET"),
          routeParams({ worldId: String(worldId) }),
        ),
      );
      expect(body[listKey]).toHaveLength(1);
    });

    it("name이 없으면 400이고 아무것도 안 생긴다", async () => {
      const { status } = await create({});

      expect(status).toBe(400);
      expect(await db.select().from(table)).toHaveLength(0);
    });

    it("색을 안 주면 순서대로 기본색이 붙는다", async () => {
      const first = await create({ name: "하나" });
      const second = await create({ name: "둘" });

      const rows = await db.select().from(table);
      const colorOf = (id: number) => rows.find((r) => r.id === id)!.color;

      expect(colorOf(first.item.id)).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colorOf(second.item.id)).not.toBe(colorOf(first.item.id));
    });

    it("색 형식이 틀리면 400이다", async () => {
      const { status } = await create({ name: "하나", color: "빨강" });

      expect(status).toBe(400);
    });

    it("없는 세계관에 만들면 404다", async () => {
      const response = await list.POST(
        jsonRequest("POST", { name: "하나" }),
        routeParams({ worldId: "9999" }),
      );

      expect(response.status).toBe(404);
    });

    it("지운 세계관에 만들면 404다", async () => {
      const [removed] = await db
        .insert(world)
        .values({ name: "지운 세계관", deletedAt: new Date() })
        .returning();

      const response = await list.POST(
        jsonRequest("POST", { name: "하나" }),
        routeParams({ worldId: String(removed.id) }),
      );

      expect(response.status).toBe(404);
    });

    it("이름을 고친다", async () => {
      const created = await create({ name: "옛 이름" });

      const { status, body } = await readJson(
        await item.PATCH(
          jsonRequest("PATCH", { name: "새 이름" }),
          itemParams(created.item.id),
        ),
      );

      expect(status).toBe(200);
      expect((body[itemKey] as { name: string }).name).toBe("새 이름");
    });

    it("지우면 목록에서 빠지고 단건 조회도 404가 된다", async () => {
      const created = await create({ name: "지울 항목" });

      const deleted = await readJson(
        await item.DELETE(jsonRequest("DELETE"), itemParams(created.item.id)),
      );
      expect(deleted.status).toBe(200);

      const after = await readJson(
        await item.GET(jsonRequest("GET"), itemParams(created.item.id)),
      );
      expect(after.status).toBe(404);

      const listed = await readJson(
        await list.GET(
          jsonRequest("GET"),
          routeParams({ worldId: String(worldId) }),
        ),
      );
      expect(listed.body[listKey]).toHaveLength(0);

      // 소프트 삭제이므로 행 자체는 남아 있어야 한다.
      const rows = await db
        .select()
        .from(table)
        .where(eq(table.id, created.item.id));
      expect(rows).toHaveLength(1);
      expect(rows[0].deletedAt).not.toBeNull();
    });

    it("없는 id는 404다", async () => {
      const { status } = await readJson(
        await item.GET(jsonRequest("GET"), itemParams(9999)),
      );

      expect(status).toBe(404);
    });

    it("목록은 sort_key 순서다", async () => {
      await create({ name: "첫째" });
      await create({ name: "둘째" });
      await create({ name: "셋째" });

      const { body } = await readJson(
        await list.GET(
          jsonRequest("GET"),
          routeParams({ worldId: String(worldId) }),
        ),
      );
      const names = (body[listKey] as { name: string }[]).map((r) => r.name);

      expect(names).toEqual(["첫째", "둘째", "셋째"]);
    });

    /**
     * 교차 탐색(항목 -> 딸린 사건)은 셋의 구현이 유일하게 다른 곳이다.
     * 인물·공간은 연결 테이블을 조인하고 시대는 event.era_id를 바로 본다.
     */
    it("단건 조회에 딸린 사건이 작중 시간순으로 실린다", async () => {
      const created = await create({ name: "주인공" });

      const [t] = await db
        .insert(timeline)
        .values({ worldId, name: "메인 타임라인" })
        .returning();
      for (const [title, sortKey] of [
        ["나중 일", 2000n],
        ["먼저 일", 1000n],
      ] as const) {
        const [e] = await db
          .insert(event)
          .values({
            worldId,
            timelineId: t.id,
            title,
            displayTime: title,
            sortKey,
          })
          .returning();
        await linkEvent(db, e.id, created.item.id);
      }

      const { status, body } = await readJson(
        await item.GET(jsonRequest("GET"), itemParams(created.item.id)),
      );

      expect(status).toBe(200);
      expect((body.events as { title: string }[]).map((e) => e.title)).toEqual([
        "먼저 일",
        "나중 일",
      ]);
    });

    it("지운 사건은 딸린 사건 목록에서 빠진다", async () => {
      const created = await create({ name: "주인공" });

      const [t] = await db
        .insert(timeline)
        .values({ worldId, name: "메인 타임라인" })
        .returning();
      const [removed] = await db
        .insert(event)
        .values({
          worldId,
          timelineId: t.id,
          title: "지운 사건",
          displayTime: "언젠가",
          sortKey: 1000n,
          deletedAt: new Date(),
        })
        .returning();
      await linkEvent(db, removed.id, created.item.id);

      const { body } = await readJson(
        await item.GET(jsonRequest("GET"), itemParams(created.item.id)),
      );

      expect(body.events).toHaveLength(0);
    });

    it("본문이 깨진 JSON이면 400이다", async () => {
      const response = await list.POST(
        rawRequest("POST", "{name:"),
        routeParams({ worldId: String(worldId) }),
      );

      expect(response.status).toBe(400);
    });

    it("경로의 worldId가 숫자가 아니면 400이다", async () => {
      const response = await list.GET(
        jsonRequest("GET"),
        routeParams({ worldId: "abc" }),
      );

      expect(response.status).toBe(400);
    });

    it("경로의 항목 id가 숫자가 아니면 400이다", async () => {
      const response = await item.GET(
        jsonRequest("GET"),
        routeParams({
          worldId: String(worldId),
          characterId: "abc",
          placeId: "abc",
          eraId: "abc",
        }),
      );

      expect(response.status).toBe(400);
    });
  },
);
