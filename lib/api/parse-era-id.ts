import { parseId } from "./request";

/**
 * 요청 본문의 eraId를 정리한다.
 *
 * 상위 기간은 선택 항목이라 "고르지 않음"을 null로 표현한다. 폼에서 빈 문자열이
 * 오거나 숫자가 아닌 값이 와도 null로 떨어뜨린다. 경로 id와 달리 잘못된 값이
 * 400이 아니라 null인 것은, 여기서는 "안 고름"과 구분할 이유가 없어서다.
 */
export function parseEraId(value: unknown): number | null {
  return parseId(value);
}
