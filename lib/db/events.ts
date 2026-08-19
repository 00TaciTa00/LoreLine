import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import type { Db } from "./index";
import { character, event, eventCharacter, eventPlace, place } from "./schema";
import {
  serializeCharacter,
  serializeEvent,
  serializePlace,
} from "./serialize";

export type EventWithRelations = ReturnType<typeof serializeEvent> & {
  places: ReturnType<typeof serializePlace>[];
  characters: ReturnType<typeof serializeCharacter>[];
};

/**
 * 여러 Event에 연결된 Place/Character를 배치 조회해 N+1을 피하고
 * 이벤트별 관계를 조립한다. 소프트 삭제된 Place/Character는 제외한다.
 */
async function attachRelations(
  db: Db,
  events: (typeof event.$inferSelect)[],
): Promise<EventWithRelations[]> {
  if (events.length === 0) return [];
  const eventIds = events.map((e) => e.id);

  const [placeLinks, characterLinks] = await Promise.all([
    db
      .select({ eventId: eventPlace.eventId, place })
      .from(eventPlace)
      .innerJoin(place, eq(eventPlace.placeId, place.id))
      .where(and(inArray(eventPlace.eventId, eventIds), isNull(place.deletedAt))),
    db
      .select({ eventId: eventCharacter.eventId, character })
      .from(eventCharacter)
      .innerJoin(character, eq(eventCharacter.characterId, character.id))
      .where(
        and(
          inArray(eventCharacter.eventId, eventIds),
          isNull(character.deletedAt),
        ),
      ),
  ]);

  const placesByEvent = new Map<
    number,
    ReturnType<typeof serializePlace>[]
  >();
  for (const link of placeLinks) {
    const list = placesByEvent.get(link.eventId) ?? [];
    list.push(serializePlace(link.place));
    placesByEvent.set(link.eventId, list);
  }

  const charactersByEvent = new Map<
    number,
    ReturnType<typeof serializeCharacter>[]
  >();
  for (const link of characterLinks) {
    const list = charactersByEvent.get(link.eventId) ?? [];
    list.push(serializeCharacter(link.character));
    charactersByEvent.set(link.eventId, list);
  }

  return events.map((e) => ({
    ...serializeEvent(e),
    places: placesByEvent.get(e.id) ?? [],
    characters: charactersByEvent.get(e.id) ?? [],
  }));
}

export async function listEventsWithRelations(
  db: Db,
  worldId: number,
): Promise<EventWithRelations[]> {
  const events = await db
    .select()
    .from(event)
    .where(and(eq(event.worldId, worldId), isNull(event.deletedAt)))
    .orderBy(asc(event.sortKey));

  return attachRelations(db, events);
}

export async function getEventWithRelations(
  db: Db,
  eventId: number,
): Promise<EventWithRelations | null> {
  const [found] = await db
    .select()
    .from(event)
    .where(and(eq(event.id, eventId), isNull(event.deletedAt)));

  if (!found) return null;

  const [withRelations] = await attachRelations(db, [found]);
  return withRelations;
}
