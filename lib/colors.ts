/**
 * Place/Character 생성 시 자동으로 배정하는 색상.
 * 스윔레인/격자에서 서로 구분되도록 채도 있는 색만 순환한다.
 *
 * 무채색은 여기 넣지 않는다. 흰색이 자동 배정되면 흰 배경에서 점·테두리가
 * 보이지 않고, 검정은 기본 글자색과 겹쳐 구분이 되지 않기 때문이다.
 * 무채색은 사용자가 직접 고를 때만 쓰인다(AUTO_COLORS와 PRESET_COLORS 구분).
 */
export const AUTO_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
] as const;

/** 무채색. 사용자가 명시적으로 고를 때만 쓴다. */
export const NEUTRAL_COLORS = [
  "#ffffff",
  "#d4d4d8",
  "#71717a",
  "#3f3f46",
  "#000000",
] as const;

/** 색상 선택 UI에 한 번에 보여주는 프리셋 */
export const PRESET_COLORS = [...AUTO_COLORS, ...NEUTRAL_COLORS] as const;

export function pickColor(seedIndex: number): string {
  return AUTO_COLORS[seedIndex % AUTO_COLORS.length];
}

/** #rgb 또는 #rrggbb 형태인지 */
export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/**
 * 입력된 색을 `#rrggbb` 소문자로 통일한다.
 * `#`을 빼먹거나 3자리로 줄여 써도 받아준다. 해석할 수 없으면 null.
 */
export function normalizeHexColor(input: string): string | null {
  const trimmed = input.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (!isValidHexColor(withHash)) return null;

  const hex = withHash.slice(1).toLowerCase();
  if (hex.length === 3) {
    // #abc -> #aabbcc
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex}`;
}
