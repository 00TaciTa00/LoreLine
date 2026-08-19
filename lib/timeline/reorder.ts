import type { EventPlacement } from "@/lib/api/types";

/**
 * 드래그 재정렬의 공통 계산.
 *
 * 사건뿐 아니라 공간·인물 목록도 같은 방식으로 순서를 바꾸므로, id만 있으면
 * 되는 부분을 여기 모아둔다.
 */
type HasId = { id: number };

/**
 * 드래그로 옮긴 위치를 서버가 이해하는 placement로 바꾼다.
 *
 * `toIndex`는 "끌던 항목을 제외한 목록"에서 삽입될 자리다. 0이면 맨 앞이고,
 * 그 외에는 바로 앞 항목 뒤에 놓는다는 뜻이다.
 *
 * @returns 서버로 보낼 placement. 제자리면 null(요청할 필요 없음).
 */
export function placementForDrop(
  items: HasId[],
  id: number,
  toIndex: number,
): EventPlacement | null {
  const fromIndex = items.findIndex((item) => item.id === id);
  if (fromIndex === -1) return null;

  const rest = items.filter((item) => item.id !== id);
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
export function reorderById<T extends HasId>(
  items: T[],
  id: number,
  placement: EventPlacement,
): T[] {
  const moving = items.find((item) => item.id === id);
  if (!moving) return items;

  const rest = items.filter((item) => item.id !== id);

  if (placement === "first") return [moving, ...rest];
  if (placement === "end") return [...rest, moving];

  const afterIndex = rest.findIndex((item) => item.id === placement);
  if (afterIndex === -1) return items;

  return [
    ...rest.slice(0, afterIndex + 1),
    moving,
    ...rest.slice(afterIndex + 1),
  ];
}
