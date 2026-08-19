import { NextRequest, NextResponse } from "next/server";

import { event, eventCharacter, eventPlace, withDb } from "@/lib/db";
import { getEventWithRelations, listEventsWithRelations } from "@/lib/db/events";
import { parsePlacement, resolveSortKeyForInsert } from "@/lib/db/sort-key";
import { getOrCreateDefaultTimeline } from "@/lib/db/timelines";
import { isWorldAlive } from "@/lib/db/worlds";

type RouteParams = { params: Promise<{ worldId: string }> };

// GET /api/worlds/:worldId/events - 작중 시간순(sort_key asc) 사건 목록 (공간/인물 포함)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;
  const events = await withDb((db) =>
    listEventsWithRelations(db, Number(worldId)),
  );
  return NextResponse.json({ events });
}

// POST /api/worlds/:worldId/events - 사건 생성
//
// body:
//   title, displayTime (필수)
//   description, color (선택)
//   placeIds: number[] (필수, 최소 1개)
//   characterIds: number[] (필수, 최소 1개)
//   placement (선택) - "first" | "end" | 사건 id(그 뒤에 삽입). 기본값은 맨 끝
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;
  const body = await request.json();
  const worldIdNum = Number(worldId);

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "title은 필수 문자열입니다." },
      { status: 400 },
    );
  }
  if (!body?.displayTime || typeof body.displayTime !== "string") {
    return NextResponse.json(
      { error: "displayTime은 필수 문자열입니다." },
      { status: 400 },
    );
  }
  const placeIds: number[] = Array.isArray(body.placeIds) ? body.placeIds : [];
  const characterIds: number[] = Array.isArray(body.characterIds)
    ? body.characterIds
    : [];
  if (placeIds.length === 0) {
    return NextResponse.json(
      { error: "공간(placeIds)은 최소 1개 이상 선택해야 합니다." },
      { status: 400 },
    );
  }
  if (characterIds.length === 0) {
    return NextResponse.json(
      { error: "인물(characterIds)은 최소 1개 이상 선택해야 합니다." },
      { status: 400 },
    );
  }

  const created = await withDb(async (db) => {
    // 삭제된 세계관에 사건을 만들면 안 된다. getOrCreateDefaultTimeline이
    // 타임라인을 새로 만들어버리기 전에 먼저 막는다.
    if (!(await isWorldAlive(db, worldIdNum))) return null;

    const timelineId = await getOrCreateDefaultTimeline(db, worldIdNum);
    const sortKey = await resolveSortKeyForInsert(
      db,
      timelineId,
      parsePlacement(body.placement) ?? { kind: "end" },
    );

    const createdId = await db.transaction(async (tx) => {
      const [createdEvent] = await tx
        .insert(event)
        .values({
          worldId: worldIdNum,
          timelineId,
          title: body.title,
          description: body.description ?? null,
          displayTime: body.displayTime,
          color: body.color ?? null,
          sortKey,
        })
        .returning({ id: event.id });

      await tx
        .insert(eventPlace)
        .values(
          placeIds.map((placeId) => ({ eventId: createdEvent.id, placeId })),
        );

      await tx.insert(eventCharacter).values(
        characterIds.map((characterId) => ({
          eventId: createdEvent.id,
          characterId,
        })),
      );

      return createdEvent.id;
    });

    return getEventWithRelations(db, createdId);
  });

  if (!created) {
    return NextResponse.json(
      { error: "세계관을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ event: created }, { status: 201 });
}
