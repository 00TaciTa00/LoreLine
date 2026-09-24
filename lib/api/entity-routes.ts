import { and, asc, count, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { INVALID_COLOR_MESSAGE, parseColor } from "@/lib/api/validate-color";
import { pickColor } from "@/lib/colors";
import type { Db } from "@/lib/db";
import { withDb } from "@/lib/db";
import type { OrderableTable } from "@/lib/db/ordering";
import { resolveSortKey } from "@/lib/db/ordering";
import type { character, era, event, place } from "@/lib/db/schema";
import { serializeEvent } from "@/lib/db/serialize";
import { parsePlacement } from "@/lib/db/sort-key";
import { isWorldAlive } from "@/lib/db/worlds";

/**
 * 인물·공간·시대 라우트를 한 벌로 만든다.
 *
 * 셋은 스키마가 같고(name/description/color/sort_key + 소프트 삭제) 하는 일도
 * 같다. 이름만 바꾼 같은 파일이 여섯 개 있었고, 시대가 들어올 때 인물 라우트를
 * 그대로 베껴 만들었다. 네 번째가 생기면 또 베끼게 된다.
 *
 * 진짜 차이는 하나뿐이다. **교차 탐색으로 딸린 사건을 찾는 방법**이 인물·공간은
 * 연결 테이블 조인이고 시대는 event.era_id 직접 참조다. 그래서 그것만 설정으로
 * 받는다.
 */

/** 셋의 컬럼 구성이 같아 union으로 받는다. */
type EntityTable = typeof character | typeof place | typeof era;
type EventRow = typeof event.$inferSelect;

export type EntityRouteConfig = {
  table: EntityTable;
  /** 순서 채번 어댑터 (lib/db/orderable-tables.ts) */
  order: OrderableTable;
  /** 목록 응답의 키. 예: "characters" */
  listKey: string;
  /** 단건 응답의 키. 예: "character" */
  itemKey: string;
  /** 경로 파라미터 이름. 예: "characterId" */
  idParam: string;
  /** 이 항목에 딸린 사건들. 작중 시간순으로 돌려준다. */
  relatedEvents: (db: Db, id: number) => Promise<EventRow[]>;
};

/** 핸들러가 받는 두 번째 인자. 라우트마다 id 파라미터 이름이 달라 넓게 받는다. */
type Ctx = { params: Promise<Record<string, string>> };

/**
 * sort_key는 BIGINT(JS bigint)라 JSON.stringify가 직렬화하지 못한다.
 * 자세한 사정은 lib/db/serialize.ts 주석 참고. 세 테이블이 같은 모양이라
 * 여기서는 한 함수로 처리한다.
 */
function serialize<T extends { sortKey: bigint }>(row: T) {
  return { ...row, sortKey: row.sortKey.toString() };
}

function notFound() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

/** GET(목록) · POST(생성) */
export function createEntityListRoutes(config: EntityRouteConfig) {
  const { table, order, listKey, itemKey } = config;

  async function GET(_request: NextRequest, { params }: Ctx) {
    const { worldId } = await params;

    const rows = await withDb((db) =>
      db
        .select()
        .from(table)
        .where(and(eq(table.worldId, Number(worldId)), isNull(table.deletedAt)))
        .orderBy(asc(table.sortKey)),
    );

    return NextResponse.json({ [listKey]: rows.map(serialize) });
  }

  async function POST(request: NextRequest, { params }: Ctx) {
    const { worldId } = await params;
    const body = await request.json();
    const worldIdNum = Number(worldId);

    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "name은 필수 문자열입니다." },
        { status: 400 },
      );
    }

    const parsedColor = parseColor(body.color);
    if (!parsedColor.ok) {
      return NextResponse.json(
        { error: INVALID_COLOR_MESSAGE },
        { status: 400 },
      );
    }

    const created = await withDb(async (db) => {
      if (!(await isWorldAlive(db, worldIdNum))) return null;

      // 기본색은 지금까지 만든 개수에 따라 돌아가며 붙는다.
      const [{ value: existingCount }] = await db
        .select({ value: count() })
        .from(table)
        .where(and(eq(table.worldId, worldIdNum), isNull(table.deletedAt)));

      // 새 항목은 목록 맨 뒤에 붙인다.
      const sortKey = await resolveSortKey(db, worldIdNum, order, {
        kind: "end",
      });

      const [row] = await db
        .insert(table)
        .values({
          worldId: worldIdNum,
          name: body.name,
          description: body.description ?? null,
          color: parsedColor.color ?? pickColor(existingCount),
          sortKey,
        })
        .returning();

      return row;
    });

    if (!created) {
      return NextResponse.json(
        { error: "세계관을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { [itemKey]: serialize(created) },
      { status: 201 },
    );
  }

  return { GET, POST };
}

/** GET(단건 + 딸린 사건) · PATCH(수정·순서 변경) · DELETE(소프트 삭제) */
export function createEntityItemRoutes(config: EntityRouteConfig) {
  const { table, order, itemKey, idParam, relatedEvents } = config;

  async function GET(_request: NextRequest, { params }: Ctx) {
    const resolved = await params;
    const id = Number(resolved[idParam]);

    const result = await withDb(async (db) => {
      const [found] = await db
        .select()
        .from(table)
        .where(and(eq(table.id, id), isNull(table.deletedAt)));

      if (!found) return null;

      return { found, events: await relatedEvents(db, id) };
    });

    if (!result) return notFound();

    return NextResponse.json({
      [itemKey]: serialize(result.found),
      events: result.events.map(serializeEvent),
    });
  }

  async function PATCH(request: NextRequest, { params }: Ctx) {
    const resolved = await params;
    const id = Number(resolved[idParam]);
    const worldIdNum = Number(resolved.worldId);
    const body = await request.json();

    const parsedColor = parseColor(body.color);
    if (!parsedColor.ok) {
      return NextResponse.json(
        { error: INVALID_COLOR_MESSAGE },
        { status: 400 },
      );
    }

    // placement가 없으면 순서를 그대로 둔다.
    const target = parsePlacement(body.placement);

    const [updated] = await withDb(async (db) => {
      const sortKey = target
        ? await resolveSortKey(db, worldIdNum, order, target, id)
        : undefined;

      return db
        .update(table)
        .set({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(parsedColor.color !== undefined
            ? { color: parsedColor.color }
            : {}),
          ...(sortKey !== undefined ? { sortKey } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(table.id, id), isNull(table.deletedAt)))
        .returning();
    });

    if (!updated) return notFound();

    return NextResponse.json({ [itemKey]: serialize(updated) });
  }

  async function DELETE(_request: NextRequest, { params }: Ctx) {
    const resolved = await params;
    const id = Number(resolved[idParam]);

    const [deleted] = await withDb((db) =>
      db
        .update(table)
        .set({ deletedAt: new Date() })
        .where(and(eq(table.id, id), isNull(table.deletedAt)))
        .returning(),
    );

    if (!deleted) return notFound();

    return NextResponse.json({ [itemKey]: serialize(deleted) });
  }

  return { GET, PATCH, DELETE };
}
