import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";

import { character, event, eventCharacter, withDb } from "@/lib/db";
import { serializeEvent } from "@/lib/db/serialize";
import { INVALID_COLOR_MESSAGE, parseColor } from "@/lib/api/validate-color";
import { characterOrder } from "@/lib/db/orderable-tables";
import { resolveSortKey } from "@/lib/db/ordering";
import { parsePlacement } from "@/lib/db/sort-key";

type RouteParams = {
  params: Promise<{ worldId: string; characterId: string }>;
};

// GET /api/worlds/:worldId/characters/:characterId - 인물 단건 + 등장 사건 목록
// (교차 탐색: 인물 -> 등장 사건)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { characterId } = await params;
  const characterIdNum = Number(characterId);

  const result = await withDb(async (db) => {
    const [found] = await db
      .select()
      .from(character)
      .where(and(eq(character.id, characterIdNum), isNull(character.deletedAt)));

    if (!found) return null;

    const relatedEvents = await db
      .select({ event })
      .from(eventCharacter)
      .innerJoin(event, eq(eventCharacter.eventId, event.id))
      .where(
        and(
          eq(eventCharacter.characterId, characterIdNum),
          isNull(event.deletedAt),
        ),
      )
      .orderBy(asc(event.sortKey));

    return { found, relatedEvents };
  });

  if (!result) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    character: result.found,
    events: result.relatedEvents.map((r) => serializeEvent(r.event)),
  });
}

// PATCH /api/worlds/:worldId/characters/:characterId - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { worldId, characterId } = await params;
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
          characterOrder,
          target,
          Number(characterId),
        )
      : undefined;

    return db
      .update(character)
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
      .where(
        and(eq(character.id, Number(characterId)), isNull(character.deletedAt)),
      )
      .returning();
  });

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ character: updated });
}

// DELETE /api/worlds/:worldId/characters/:characterId - 소프트 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { characterId } = await params;

  const [deleted] = await withDb((db) =>
    db
      .update(character)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(character.id, Number(characterId)), isNull(character.deletedAt)),
      )
      .returning(),
  );

  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ character: deleted });
}
