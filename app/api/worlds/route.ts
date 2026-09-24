import { NextRequest, NextResponse } from "next/server";
import { isNull } from "drizzle-orm";

import { invalidBody, readJsonBody } from "@/lib/api/request";
import { timeline, withDb, world } from "@/lib/db";
import { DEFAULT_TIMELINE_NAME } from "@/lib/db/timelines";

// GET /api/worlds - 세계관 목록 조회
export async function GET() {
  const worlds = await withDb((db) =>
    db.select().from(world).where(isNull(world.deletedAt)),
  );

  return NextResponse.json({ worlds });
}

// POST /api/worlds - 세계관 생성 (+ 메인 타임라인 자동 생성)
export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body) return invalidBody();

  // const에 담아야 아래 클로저 안까지 string으로 좁혀진 채로 남는다.
  const name = body.name;
  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "name은 필수 문자열입니다." },
      { status: 400 },
    );
  }

  const created = await withDb((db) =>
    db.transaction(async (tx) => {
      const [createdWorld] = await tx
        .insert(world)
        .values({
          name,
          description: (body.description as string | null | undefined) ?? null,
        })
        .returning();

      await tx
        .insert(timeline)
        .values({ worldId: createdWorld.id, name: DEFAULT_TIMELINE_NAME });

      return createdWorld;
    }),
  );

  return NextResponse.json({ world: created }, { status: 201 });
}
