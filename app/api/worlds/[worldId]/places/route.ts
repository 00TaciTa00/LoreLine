import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";

import { place, withDb } from "@/lib/db";
import { pickColor } from "@/lib/colors";

type RouteParams = { params: Promise<{ worldId: string }> };

// GET /api/worlds/:worldId/places - 세계관의 공간 목록
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;

  const places = await withDb((db) =>
    db
      .select()
      .from(place)
      .where(and(eq(place.worldId, Number(worldId)), isNull(place.deletedAt))),
  );

  return NextResponse.json({ places });
}

// POST /api/worlds/:worldId/places - 공간 생성
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;
  const body = await request.json();
  const worldIdNum = Number(worldId);

  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name은 필수 문자열입니다." },
      { status: 400 },
    );
  }

  const created = await withDb(async (db) => {
    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(place)
      .where(and(eq(place.worldId, worldIdNum), isNull(place.deletedAt)));

    const [row] = await db
      .insert(place)
      .values({
        worldId: worldIdNum,
        name: body.name,
        description: body.description ?? null,
        color: body.color ?? pickColor(existingCount),
      })
      .returning();

    return row;
  });

  return NextResponse.json({ place: created }, { status: 201 });
}
