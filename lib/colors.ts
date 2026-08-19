/**
 * Place/Character 생성 시 자동으로 배정하는 색상 팔레트.
 * 스윔레인/타임라인에서 서로 구분하기 쉽도록 채도 있는 색을 순환 배정한다.
 */
export const COLOR_SWATCHES = [
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

export function pickColor(seedIndex: number): string {
  return COLOR_SWATCHES[seedIndex % COLOR_SWATCHES.length];
}
