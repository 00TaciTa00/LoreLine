import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";

import { event, eventPlace, place, withDb } from "@/lib/db";
import { serializeEvent } from "@/lib/db/serialize";
import { INVALID_COLOR_MESSAGE, parseColor } from "@/lib/api/validate-color";
import { placeOrder } from "@/lib/db/orderable-tables";
import { resolveSortKey } from "@/lib/db/ordering";
import { parsePlacement } from "@/lib/db/sort-key";

type RouteParams = { params: Promise<{ worldId: string; placeId: string }> };

// GET /api/worlds/:worldId/places/:placeId - 공간 단건 + 관련 사건 목록
// (교차 탐색: 공간 -> 관련 사건)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { placeId } = await params;
  const placeIdNum = Number(placeId);

  const result = await withDb(async (db) => {
    const [found] = await db
      .select()
      .from(place)
      .where(and(eq(place.id, placeIdNum), isNull(place.deletedAt)));

    if (!found) return null;

    const relatedEvents = await db
      .select({ event })
      .from(eventPlace)
      .innerJoin(event, eq(eventPlace.eventId, event.id))
      .where(and(eq(eventPlace.placeId, placeIdNum), isNull(event.deletedAt)))
      .orderBy(asc(event.sortKey));

    return { found, relatedEvents };
  });

  if (!result) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    place: result.found,
    events: result.relatedEvents.map((r) => serializeEvent(r.event)),
  });
}

// PATCH /api/worlds/:worldId/places/:placeId - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { worldId, placeId } = await params;
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
          placeOrder,
          target,
          Number(placeId),
        )
      : undefined;

    return db
      .update(place)
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
      .where(and(eq(place.id, Number(placeId)), isNull(place.deletedAt)))
      .returning();
  });

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ place: updated });
}

// DELETE /api/worlds/:worldId/places/:placeId - 소프트 삭제
// (event_place 조인 행은 그대로 두되, 이후 조회 시 삭제된 공간은 필터링된다)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { placeId } = await params;

  const [deleted] = await withDb((db) =>
    db
      .update(place)
      .set({ deletedAt: new Date() })
      .where(and(eq(place.id, Number(placeId)), isNull(place.deletedAt)))
      .returning(),
  );

  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ place: deleted });
}
