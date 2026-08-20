import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";

import { era, event, withDb } from "@/lib/db";
import { serializeEra, serializeEvent } from "@/lib/db/serialize";
import { eraOrder } from "@/lib/db/orderable-tables";
import { resolveSortKey } from "@/lib/db/ordering";
import { parsePlacement } from "@/lib/db/sort-key";
import { INVALID_COLOR_MESSAGE, parseColor } from "@/lib/api/validate-color";

type RouteParams = { params: Promise<{ worldId: string; eraId: string }> };

// GET /api/worlds/:worldId/eras/:eraId - 상위 기간 단건 + 이 기간의 사건 목록
// (교차 탐색: 기간 -> 사건)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { eraId } = await params;
  const eraIdNum = Number(eraId);

  const result = await withDb(async (db) => {
    const [found] = await db
      .select()
      .from(era)
      .where(and(eq(era.id, eraIdNum), isNull(era.deletedAt)));

    if (!found) return null;

    const relatedEvents = await db
      .select()
      .from(event)
      .where(and(eq(event.eraId, eraIdNum), isNull(event.deletedAt)))
      .orderBy(asc(event.sortKey));

    return { found, relatedEvents };
  });

  if (!result) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    era: serializeEra(result.found),
    events: result.relatedEvents.map(serializeEvent),
  });
}

// PATCH /api/worlds/:worldId/eras/:eraId - 수정 (placement로 순서 변경도 겸한다)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { worldId, eraId } = await params;
  const body = await request.json();

  const parsedColor = parseColor(body.color);
  if (!parsedColor.ok) {
    return NextResponse.json({ error: INVALID_COLOR_MESSAGE }, { status: 400 });
  }

  // placement가 없으면 순서를 그대로 둔다.
  const target = parsePlacement(body.placement);

  const [updated] = await withDb(async (db) => {
    const sortKey = target
      ? await resolveSortKey(
          db,
          Number(worldId),
          eraOrder,
          target,
          Number(eraId),
        )
      : undefined;

    return db
      .update(era)
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
      .where(and(eq(era.id, Number(eraId)), isNull(era.deletedAt)))
      .returning();
  });

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ era: serializeEra(updated) });
}

// DELETE /api/worlds/:worldId/eras/:eraId - 소프트 삭제
//
// 이 기간을 쓰던 사건은 지우지 않는다. event.era_id는 남지만 조회할 때
// 삭제된 기간은 걸러지므로, 사건은 상위 기간 없이 하위 시각만 표시된다.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { eraId } = await params;

  const [deleted] = await withDb((db) =>
    db
      .update(era)
      .set({ deletedAt: new Date() })
      .where(and(eq(era.id, Number(eraId)), isNull(era.deletedAt)))
      .returning(),
  );

  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ era: serializeEra(deleted) });
}
