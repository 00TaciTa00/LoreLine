import type { EventPlacement } from "@/lib/api/types";

import type { GridRow } from "./grid";
import { placementForDrop } from "./reorder";

/**
 * 격자에서 카드를 세로로 끌어 옮겼을 때의 placement를 계산한다.
 *
 * 격자는 행이 시간, 열이 공간·인물이다. 그래서 **세로 이동만 순서 변경으로
 * 본다.** 다른 열로 끄는 것은 "순서를 바꾼다"는 뜻인지 "공간·인물을 바꾼다"는
 * 뜻인지 알 수 없고, 한 사건이 여러 공간에 걸쳐 있을 수도 있어 해석이 갈린다.
 * 어느 열에 놓든 그 행 위치로만 옮긴다.
 *
 * @param gapIndex 행 사이의 틈. 0이면 첫 행 앞, rows.length면 마지막 행 뒤.
 * @returns 서버로 보낼 placement. 제자리면 null.
 *
 * NOTE: 열 필터로 숨긴 사건은 rows에 없다. 그래서 "이 사건 뒤"는 화면에 보이는
 * 것들 기준이며, 숨겨진 사건 사이의 정확한 위치까지는 지정하지 못한다.
 * 최종 sort_key는 서버가 전체 사건을 보고 정한다.
 */
export function placementForRowDrop(
  rows: GridRow[],
  eventId: number,
  gapIndex: number,
): EventPlacement | null {
  // 행을 펼쳐 시간순 사건 목록으로 만든다.
  const flat = rows.flatMap((row) => row.events);

  const fromIndex = flat.findIndex((e) => e.id === eventId);
  if (fromIndex === -1) return null;

  // 틈 앞에 놓인 사건 수 = 삽입될 자리(끌던 항목 포함 기준)
  const clampedGap = Math.max(0, Math.min(gapIndex, rows.length));
  let rawIndex = 0;
  for (let i = 0; i < clampedGap; i++) {
    rawIndex += rows[i].events.length;
  }

  // 끌던 항목을 빼고 나면 뒤쪽 자리는 하나씩 당겨진다.
  const toIndex = fromIndex < rawIndex ? rawIndex - 1 : rawIndex;

  return placementForDrop(flat, eventId, toIndex);
}
