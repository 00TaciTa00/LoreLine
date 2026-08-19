import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { event, eventCharacter, eventPlace, withDb } from "@/lib/db";
import { getEventWithRelations } from "@/lib/db/events";
import { serializeEvent } from "@/lib/db/serialize";
import { parsePlacement, resolveSortKeyForInsert } from "@/lib/db/sort-key";
import { INVALID_COLOR_MESSAGE, parseColor } from "@/lib/api/validate-color";

type RouteParams = { params: Promise<{ worldId: string; eventId: string }> };

// GET /api/worlds/:worldId/events/:eventId - 사건 단건 + 공간/인물 관계
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const found = await withDb((db) =>
    getEventWithRelations(db, Number(eventId)),
  );

  if (!found) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ event: found });
}

// PATCH /api/worlds/:worldId/events/:eventId - 수정
//
// body: title, description, displayTime, color, placeIds, characterIds,
//       placement("first" | "end" | 사건 id, 없으면 순서 유지)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const eventIdNum = Number(eventId);
  const body = await request.json();

  if (body.placeIds !== undefined) {
    if (!Array.isArray(body.placeIds) || body.placeIds.length === 0) {
      return NextResponse.json(
        { error: "공간(placeIds)은 최소 1개 이상 선택해야 합니다." },
        { status: 400 },
      );
    }
  }
  if (body.characterIds !== undefined) {
    if (!Array.isArray(body.characterIds) || body.characterIds.length === 0) {
      return NextResponse.json(
        { error: "인물(characterIds)은 최소 1개 이상 선택해야 합니다." },
        { status: 400 },
      );
    }
  }

  // 사건 색상은 선택 사항이라 null(색 지움)도 허용한다.
  const parsedColor = body.color === null ? null : parseColor(body.color);
  if (parsedColor !== null && !parsedColor.ok) {
    return NextResponse.json({ error: INVALID_COLOR_MESSAGE }, { status: 400 });
  }

  const updated = await withDb(async (db) => {
    const [current] = await db
      .select()
      .from(event)
      .where(and(eq(event.id, eventIdNum), isNull(event.deletedAt)));

    if (!current) return null;

    // placement가 없거나 해석되지 않으면 현재 순서를 그대로 둔다.
    const target = parsePlacement(body.placement);
    const sortKey = target
      ? await resolveSortKeyForInsert(
          db,
          current.timelineId,
          target,
          eventIdNum,
        )
      : undefined;

    await db.transaction(async (tx) => {
      await tx
        .update(event)
        .set({
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.displayTime !== undefined
            ? { displayTime: body.displayTime }
            : {}),
          ...(body.color === null
            ? { color: null }
            : parsedColor !== null && parsedColor.color !== undefined
              ? { color: parsedColor.color }
              : {}),
          ...(sortKey !== undefined ? { sortKey } : {}),
          updatedAt: new Date(),
        })
        .where(eq(event.id, eventIdNum));

      if (body.placeIds !== undefined) {
        await tx.delete(eventPlace).where(eq(eventPlace.eventId, eventIdNum));
        await tx.insert(eventPlace).values(
          (body.placeIds as number[]).map((placeId) => ({
            eventId: eventIdNum,
            placeId,
          })),
        );
      }

      if (body.characterIds !== undefined) {
        await tx
          .delete(eventCharacter)
          .where(eq(eventCharacter.eventId, eventIdNum));
        await tx.insert(eventCharacter).values(
          (body.characterIds as number[]).map((characterId) => ({
            eventId: eventIdNum,
            characterId,
          })),
        );
      }
    });

    return getEventWithRelations(db, eventIdNum);
  });

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ event: updated });
}

// DELETE /api/worlds/:worldId/events/:eventId - 소프트 삭제
// (event_place/event_character 조인 행은 그대로 두되, 삭제된 사건은 이후
// 목록/관계 조회에서 필터링된다)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;

  const [deleted] = await withDb((db) =>
    db
      .update(event)
      .set({ deletedAt: new Date() })
      .where(and(eq(event.id, Number(eventId)), isNull(event.deletedAt)))
      .returning(),
  );

  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // sortKey는 bigint라 그대로는 JSON 직렬화되지 않는다.
  return NextResponse.json({ event: serializeEvent(deleted) });
}
