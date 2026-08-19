import { normalizeHexColor } from "@/lib/colors";

export type ColorParseResult =
  | { ok: true; color: string | undefined }
  | { ok: false };

/**
 * 요청 본문의 color 값을 검증해 `#rrggbb`로 정규화한다.
 *
 * 색상은 원래 고정 팔레트에서만 골랐지만 이제 사용자가 임의의 값을 넣을 수
 * 있게 되어, API로도 아무 문자열이나 들어올 수 있다. 저장 전에 형식을 맞춰
 * DB에 해석 불가능한 값이 쌓이지 않게 한다.
 *
 * 값이 없으면 `color: undefined`로 통과시킨다(변경하지 않음을 뜻함).
 */
export function parseColor(value: unknown): ColorParseResult {
  if (value === undefined) return { ok: true, color: undefined };
  if (typeof value !== "string") return { ok: false };

  const normalized = normalizeHexColor(value);
  return normalized ? { ok: true, color: normalized } : { ok: false };
}

export const INVALID_COLOR_MESSAGE =
  "color는 #rgb 또는 #rrggbb 형식이어야 합니다.";
