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
import { timeline, world } from "@/lib/db/schema";
import { createTestDb, resetTables } from "@/lib/db/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  const { withTestDb } = await import("@/lib/api/route-test");
  return { ...actual, withDb: withTestDb };
});

// 모킹이 적용된 뒤에 불러와야 핸들러가 바뀐 withDb를 본다.
const { GET, POST } = await import("./route");
const { GET: GET_ONE, PATCH, DELETE } = await import("./[worldId]/route");

describe("/api/worlds", () => {
  let db: Db;
  let close: () => Promise<void>;

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
  });

  describe("POST", () => {
    it("세계관과 메인 타임라인을 함께 만든다", async () => {
      const { status, body } = await readJson(
        await POST(jsonRequest("POST", { name: "판데모니움" })),
      );

      expect(status).toBe(201);
      const created = body.world as { id: number; name: string };
      expect(created.name).toBe("판데모니움");

      // 타임라인이 같이 생겨야 한다. 안 그러면 사건을 만들 때가 되어서야
      // 없다는 걸 알게 된다.
      const timelines = await db
        .select()
        .from(timeline)
        .where(eq(timeline.worldId, created.id));
      expect(timelines).toHaveLength(1);
    });

    it("name이 없으면 400이고 아무것도 만들지 않는다", async () => {
      const { status } = await readJson(await POST(jsonRequest("POST", {})));

      expect(status).toBe(400);
      expect(await db.select().from(world)).toHaveLength(0);
      expect(await db.select().from(timeline)).toHaveLength(0);
    });

    it("본문이 깨진 JSON이면 500이 아니라 400이다", async () => {
      const response = await POST(rawRequest("POST", "{name:"));

      expect(response.status).toBe(400);
      expect(await db.select().from(world)).toHaveLength(0);
    });

    it("name이 문자열이 아니면 400이다", async () => {
      const { status } = await readJson(
        await POST(jsonRequest("POST", { name: 42 })),
      );

      expect(status).toBe(400);
    });
  });

  describe("GET", () => {
    it("소프트 삭제된 세계관은 목록에서 빠진다", async () => {
      const [kept] = await db
        .insert(world)
        .values({ name: "남는 세계관" })
        .returning();
      const [removed] = await db
        .insert(world)
        .values({ name: "지운 세계관", deletedAt: new Date() })
        .returning();

      const { body } = await readJson(await GET());
      const names = (body.worlds as { id: number; name: string }[]).map(
        (w) => w.name,
      );

      expect(names).toContain(kept.name);
      expect(names).not.toContain(removed.name);
    });
  });

  describe("/:worldId", () => {
    it("경로의 worldId가 숫자가 아니면 400이다", async () => {
      const response = await GET_ONE(
        jsonRequest("GET"),
        routeParams({ worldId: "abc" }),
      );

      expect(response.status).toBe(400);
    });

    it("없는 세계관은 404다", async () => {
      const { status } = await readJson(
        await GET_ONE(jsonRequest("GET"), routeParams({ worldId: "9999" })),
      );

      expect(status).toBe(404);
    });

    it("소프트 삭제된 세계관은 404다", async () => {
      const [removed] = await db
        .insert(world)
        .values({ name: "지운 세계관", deletedAt: new Date() })
        .returning();

      const { status } = await readJson(
        await GET_ONE(
          jsonRequest("GET"),
          routeParams({ worldId: String(removed.id) }),
        ),
      );

      expect(status).toBe(404);
    });

    it("이름을 고친다", async () => {
      const [created] = await db
        .insert(world)
        .values({ name: "옛 이름" })
        .returning();

      const { status, body } = await readJson(
        await PATCH(
          jsonRequest("PATCH", { name: "새 이름" }),
          routeParams({ worldId: String(created.id) }),
        ),
      );

      expect(status).toBe(200);
      expect((body.world as { name: string }).name).toBe("새 이름");
    });

    it("지우면 목록에서 빠지고 단건 조회도 404가 된다", async () => {
      const [created] = await db
        .insert(world)
        .values({ name: "지울 세계관" })
        .returning();
      const params = routeParams({ worldId: String(created.id) });

      const deleted = await readJson(
        await DELETE(jsonRequest("DELETE"), params),
      );
      expect(deleted.status).toBe(200);

      const after = await readJson(
        await GET_ONE(
          jsonRequest("GET"),
          routeParams({ worldId: String(created.id) }),
        ),
      );
      expect(after.status).toBe(404);

      const list = await readJson(await GET());
      expect(list.body.worlds).toHaveLength(0);
    });

    it("이미 지운 세계관을 다시 지우면 404다", async () => {
      const [created] = await db
        .insert(world)
        .values({ name: "지울 세계관" })
        .returning();

      await DELETE(
        jsonRequest("DELETE"),
        routeParams({ worldId: String(created.id) }),
      );
      const { status } = await readJson(
        await DELETE(
          jsonRequest("DELETE"),
          routeParams({ worldId: String(created.id) }),
        ),
      );

      expect(status).toBe(404);
    });
  });
});
