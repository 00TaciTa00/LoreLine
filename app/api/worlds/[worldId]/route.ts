import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { withDb, world } from "@/lib/db";

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
// NOTE: 하위 Timeline/Event/Place/Character는 별도로 소프트 삭제하지 않는다.
// 목록/조회 API는 world가 삭제된 세계관의 자식 데이터를 노출하지 않도록
// 클라이언트에서 삭제된 세계관을 더 이상 선택하지 않는 것으로 충분하다.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { worldId } = await params;

  const [deleted] = await withDb((db) =>
    db
      .update(world)
      .set({ deletedAt: new Date() })
      .where(and(eq(world.id, Number(worldId)), isNull(world.deletedAt)))
      .returning(),
  );

  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ world: deleted });
}
