/**
 * 요청 본문의 eraId를 정리한다.
 *
 * 상위 기간은 선택 항목이라 "고르지 않음"을 null로 표현한다. 폼에서 빈 문자열이
 * 오거나 숫자가 아닌 값이 와도 null로 떨어뜨린다.
 */
export function parseEraId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
