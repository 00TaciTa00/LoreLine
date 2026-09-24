import { and, asc, eq, isNull } from "drizzle-orm";

import type { EntityRouteConfig } from "@/lib/api/entity-routes";
import type { Db } from "@/lib/db";
import {
  characterOrder,
  eraOrder,
  placeOrder,
} from "@/lib/db/orderable-tables";
import {
  character,
  era,
  event,
  eventCharacter,
  eventPlace,
  place,
} from "@/lib/db/schema";

/**
 * 인물·공간·시대 라우트의 설정. 목록 라우트와 단건 라우트가 같은 것을 쓴다.
 *
 * 셋의 차이는 딸린 사건을 찾는 방법뿐이다. 인물·공간은 다대다라 연결 테이블을
 * 조인하고, 시대는 사건이 하나만 고르므로 event.era_id를 바로 본다.
 */

export const characterEntity: EntityRouteConfig = {
  table: character,
  order: characterOrder,
  listKey: "characters",
  itemKey: "character",
  idParam: "characterId",
  relatedEvents: async (db: Db, id: number) => {
    const rows = await db
      .select({ event })
      .from(eventCharacter)
      .innerJoin(event, eq(eventCharacter.eventId, event.id))
      .where(and(eq(eventCharacter.characterId, id), isNull(event.deletedAt)))
      .orderBy(asc(event.sortKey));
    return rows.map((r) => r.event);
  },
};

export const placeEntity: EntityRouteConfig = {
  table: place,
  order: placeOrder,
  listKey: "places",
  itemKey: "place",
  idParam: "placeId",
  relatedEvents: async (db: Db, id: number) => {
    const rows = await db
      .select({ event })
      .from(eventPlace)
      .innerJoin(event, eq(eventPlace.eventId, event.id))
      .where(and(eq(eventPlace.placeId, id), isNull(event.deletedAt)))
      .orderBy(asc(event.sortKey));
    return rows.map((r) => r.event);
  },
};

export const eraEntity: EntityRouteConfig = {
  table: era,
  order: eraOrder,
  listKey: "eras",
  itemKey: "era",
  idParam: "eraId",
  relatedEvents: (db: Db, id: number) =>
    db
      .select()
      .from(event)
      .where(and(eq(event.eraId, id), isNull(event.deletedAt)))
      .orderBy(asc(event.sortKey)),
};
