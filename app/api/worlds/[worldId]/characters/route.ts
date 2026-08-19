import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";

import { character, withDb } from "@/lib/db";
import { pickColor } from "@/lib/colors";

type RouteParams = { params: Promise<{ worldId: string }> };

// GET /api/worlds/:worldId/characters - 세계관의 인물 목록
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;

  const characters = await withDb((db) =>
    db
      .select()
      .from(character)
      .where(
        and(eq(character.worldId, Number(worldId)), isNull(character.deletedAt)),
      ),
  );

  return NextResponse.json({ characters });
}

// POST /api/worlds/:worldId/characters - 인물 생성
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
      .from(character)
      .where(
        and(eq(character.worldId, worldIdNum), isNull(character.deletedAt)),
      );

    const [row] = await db
      .insert(character)
      .values({
        worldId: worldIdNum,
        name: body.name,
        description: body.description ?? null,
        color: body.color ?? pickColor(existingCount),
      })
      .returning();

    return row;
  });

  return NextResponse.json({ character: created }, { status: 201 });
}
