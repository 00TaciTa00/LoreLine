import type { EventItem, EventPlacement } from "@/lib/api/types";

/**
 * 드래그로 옮긴 위치를 서버가 이해하는 placement로 바꾼다.
 *
 * `toIndex`는 "끌던 항목을 제외한 목록"에서 삽입될 자리다. 0이면 맨 앞이고,
 * 그 외에는 바로 앞 항목 뒤에 놓는다는 뜻이다.
 *
 * @param events   현재 화면 순서(작중 시간순)
 * @param eventId  끌고 있는 사건
 * @param toIndex  삽입 위치 (끌던 항목 제외 기준)
 * @returns 서버로 보낼 placement. 제자리면 null(요청할 필요 없음).
 */
export function placementForDrop(
  events: EventItem[],
  eventId: number,
  toIndex: number,
): EventPlacement | null {
  const fromIndex = events.findIndex((e) => e.id === eventId);
  if (fromIndex === -1) return null;

  const rest = events.filter((e) => e.id !== eventId);
  const clamped = Math.max(0, Math.min(toIndex, rest.length));

  // 제자리로 떨어뜨린 경우 (원래 자리, 또는 바로 뒤로 미는 시늉)
  if (clamped === fromIndex) return null;

  if (clamped === 0) return "first";
  return rest[clamped - 1].id;
}

/**
 * 서버 응답을 기다리는 동안 화면 순서를 먼저 바꾼다(낙관적 갱신).
 * 실제 sort_key는 서버가 정하므로 여기서는 배열 순서만 맞춘다.
 */
export function reorderEvents(
  events: EventItem[],
  eventId: number,
  placement: EventPlacement,
): EventItem[] {
  const moving = events.find((e) => e.id === eventId);
  if (!moving) return events;

  const rest = events.filter((e) => e.id !== eventId);

  if (placement === "first") return [moving, ...rest];
  if (placement === "end") return [...rest, moving];

  const afterIndex = rest.findIndex((e) => e.id === placement);
  if (afterIndex === -1) return events;

  return [
    ...rest.slice(0, afterIndex + 1),
    moving,
    ...rest.slice(afterIndex + 1),
  ];
}
