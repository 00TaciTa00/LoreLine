import type { character, event, place } from "./schema";

type EventRow = typeof event.$inferSelect;
type PlaceRow = typeof place.$inferSelect;
type CharacterRow = typeof character.$inferSelect;

/**
 * sort_key는 BIGINT(JS bigint)로 조회되는데 JSON.stringify는 bigint를
 * 직렬화하지 못한다(`TypeError: Do not know how to serialize a BigInt`).
 * API로 내보내기 전에 문자열로 바꾼다.
 *
 * 규칙을 하나로 두는 이유: 공간·인물에 sort_key가 생겼을 때 사건만 변환하고
 * 나머지를 빠뜨려 목록 API가 통째로 500이 났다. 정렬 키를 가진 모든 행은
 * 여기를 거쳐 나간다.
 */
export function serializeEvent<T extends EventRow>(row: T) {
  return { ...row, sortKey: row.sortKey.toString() };
}

export function serializePlace<T extends PlaceRow>(row: T) {
  return { ...row, sortKey: row.sortKey.toString() };
}

export function serializeCharacter<T extends CharacterRow>(row: T) {
  return { ...row, sortKey: row.sortKey.toString() };
}
