import { asc, eq } from "drizzle-orm";

import type { Db } from "./index";
import { event } from "./schema";

/**
 * 가상 시간축 정렬 전용 sort_key 채번 전략.
 *
 * - 초기/말단 삽입: 마지막 sort_key + INITIAL_GAP
 * - 중간 삽입: 양옆 sort_key의 평균값
 * - 양옆 간격이 MIN_GAP 이하로 좁아지면 더 이상 평균을 낼 수 없으므로
 *   rebalanceTimeline()으로 재채번한 뒤 다시 계산해야 한다.
 */
export const INITIAL_GAP = 1000n;
export const MIN_GAP = 2n;

/** 시퀀스 맨 끝에 새 이벤트를 추가할 때 사용할 sort_key */
export function appendSortKey(lastSortKey: bigint | null): bigint {
  return lastSortKey === null ? INITIAL_GAP : lastSortKey + INITIAL_GAP;
}

export type InsertSortKeyResult =
  | { needsRebalance: false; sortKey: bigint }
  | { needsRebalance: true };

/**
 * before/after 사이에 이벤트를 삽입할 때 사용할 sort_key를 계산한다.
 * 간격이 좁아 더 이상 평균을 낼 수 없으면 needsRebalance: true를 반환하며,
 * 이 경우 호출자는 rebalanceTimeline()을 먼저 실행한 뒤 재계산해야 한다.
 */
export function insertSortKey(
  before: bigint | null,
  after: bigint | null,
): InsertSortKeyResult {
  if (before === null && after === null) {
    return { needsRebalance: false, sortKey: INITIAL_GAP };
  }
  if (before === null) {
    // 맨 앞에 삽입
    return { needsRebalance: false, sortKey: after! - INITIAL_GAP };
  }
  if (after === null) {
    // 맨 뒤에 삽입
    return { needsRebalance: false, sortKey: before + INITIAL_GAP };
  }

  const gap = after - before;
  if (gap <= MIN_GAP) {
    return { needsRebalance: true };
  }
  return { needsRebalance: false, sortKey: before + gap / 2n };
}

/**
 * 타임라인 내 모든(soft-delete 되지 않은) 이벤트를 현재 순서 그대로 유지한 채
 * INITIAL_GAP 간격으로 sort_key를 재채번한다. 트랜잭션으로 처리하여
 * 중간 실패 시 부분 재정렬 상태가 남지 않도록 한다.
 *
 * NOTE: 초기 세팅 범위에서는 단순화를 위해 타임라인 전체를 재정렬한다.
 * 이벤트 수가 매우 많은 타임라인에서는 좁아진 구간 주변만 재정렬하는
 * windowed rebalance로 최적화할 수 있다 (추후 개선 여지).
 */
export async function rebalanceTimeline(
  db: Db,
  timelineId: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const events = await tx
      .select({ id: event.id })
      .from(event)
      .where(eq(event.timelineId, timelineId))
      .orderBy(asc(event.sortKey));

    for (let i = 0; i < events.length; i++) {
      const sortKey = INITIAL_GAP * BigInt(i + 1);
      await tx
        .update(event)
        .set({ sortKey })
        .where(eq(event.id, events[i].id));
    }
  });
}

/**
 * 사건을 시퀀스 어디에 놓을지 나타낸다.
 *
 * NOTE: 예전에는 `afterEventId: number | null`로 표현했는데, null이
 * "맨 앞"이 아니라 "맨 뒤"를 뜻해서 맨 앞으로 옮길 방법이 아예 없었다.
 * 세 경우를 명시적으로 구분한다.
 */
export type InsertTarget =
  | { kind: "end" }
  | { kind: "first" }
  | { kind: "after"; eventId: number };

/**
 * target 위치에 삽입할 sort_key를 계산한다. 간격이 좁아 재정렬이 필요하면
 * rebalanceTimeline()을 먼저 실행한 뒤 재계산한다.
 *
 * excludeEventId: 이벤트 수정(재정렬) 시 자기 자신을 시퀀스에서 제외하기 위함.
 */
export async function resolveSortKeyForInsert(
  db: Db,
  timelineId: number,
  target: InsertTarget,
  excludeEventId?: number,
): Promise<bigint> {
  const siblings = (
    await db
      .select({ id: event.id, sortKey: event.sortKey })
      .from(event)
      .where(eq(event.timelineId, timelineId))
      .orderBy(asc(event.sortKey))
  ).filter((s) => s.id !== excludeEventId);

  if (target.kind === "end") {
    return appendSortKey(siblings.at(-1)?.sortKey ?? null);
  }

  // 맨 앞은 첫 사건보다 INITIAL_GAP 앞에 둔다. 반복하면 sort_key가 음수로
  // 내려가는데, 정렬 전용 값이므로 문제되지 않는다.
  const [before, after] =
    target.kind === "first"
      ? [null, siblings[0]?.sortKey ?? null]
      : (() => {
          const idx = siblings.findIndex((s) => s.id === target.eventId);
          return [
            siblings[idx]?.sortKey ?? null,
            siblings[idx + 1]?.sortKey ?? null,
          ] as const;
        })();

  const result = insertSortKey(before, after);
  if (!result.needsRebalance) {
    return result.sortKey;
  }

  await rebalanceTimeline(db, timelineId);
  return resolveSortKeyForInsert(db, timelineId, target, excludeEventId);
}

/**
 * 클라이언트가 보낸 placement 값을 InsertTarget으로 변환한다.
 * - undefined  : 호출자가 기본값을 정한다(생성은 "end", 수정은 "순서 유지")
 * - "first"    : 맨 앞으로
 * - "end"      : 맨 뒤로
 * - 숫자/숫자문자열 : 해당 사건 바로 뒤로
 */
export function parsePlacement(value: unknown): InsertTarget | null {
  if (value === "first") return { kind: "first" };
  if (value === "end") return { kind: "end" };

  const eventId = Number(value);
  if (Number.isInteger(eventId) && eventId > 0) {
    return { kind: "after", eventId };
  }
  return null;
}
