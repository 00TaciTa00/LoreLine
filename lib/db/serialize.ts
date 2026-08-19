import type { event } from "./schema";

type EventRow = typeof event.$inferSelect;

/**
 * sort_key는 BIGINT(JS bigint)로 조회되는데 JSON.stringify는 bigint를
 * 직렬화할 수 없으므로 API 응답 전에 문자열로 변환한다.
 */
export function serializeEvent<T extends EventRow>(row: T) {
  return { ...row, sortKey: row.sortKey.toString() };
}
