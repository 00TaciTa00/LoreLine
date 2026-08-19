import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { withDb, world } from "@/lib/db";
import { softDeleteWorld } from "@/lib/db/worlds";

type RouteParams = { params: Promise<{ worldId: string }> };

// GET /api/worlds/:worldId - 세계관 단건 조회
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;

  const [found] = await withDb((db) =>
    db
      .select()
      .from(world)
      .where(and(eq(world.id, Number(worldId)), isNull(world.deletedAt))),
  );

  if (!found) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ world: found });
}

// PATCH /api/worlds/:worldId - 세계관 이름/설명 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;
  const body = await request.json();

  if (body?.name !== undefined && typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name은 문자열이어야 합니다." },
      { status: 400 },
    );
  }

  const [updated] = await withDb((db) =>
    db
      .update(world)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(world.id, Number(worldId)), isNull(world.deletedAt)))
      .returning(),
  );

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ world: updated });
}

// DELETE /api/worlds/:worldId - 소프트 삭제
// 하위 Timeline/Event/Place/Character도 함께 소프트 삭제된다.
// (자세한 이유는 lib/db/worlds.ts의 softDeleteWorld 주석 참고)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;

  const deleted = await withDb((db) =>
    softDeleteWorld(db, Number(worldId)),
  );

  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ world: deleted });
}
