import { NextRequest, NextResponse } from "next/server";

import { event, eventCharacter, eventPlace, withDb } from "@/lib/db";
import { getEventWithRelations, listEventsWithRelations } from "@/lib/db/events";
import { resolveSortKeyForInsert } from "@/lib/db/sort-key";
import { getOrCreateDefaultTimeline } from "@/lib/db/timelines";

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
//   afterEventId (선택) - 지정 시 해당 이벤트 바로 뒤에 삽입, 없으면 맨 끝에 추가
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
    const timelineId = await getOrCreateDefaultTimeline(db, worldIdNum);
    const sortKey = await resolveSortKeyForInsert(
      db,
      timelineId,
      body.afterEventId ? Number(body.afterEventId) : null,
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

  return NextResponse.json({ event: created }, { status: 201 });
}
