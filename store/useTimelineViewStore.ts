import { create } from "zustand";

/**
 * 타임라인 뷰 관련 클라이언트 전용 UI 상태.
 * 서버 데이터(World/Event/Place/Character)는 React Query가 담당한다.
 *
 * - all       : 모든 사건을 작중 시간순 카드 목록으로
 * - place     : 세로축=시간, 가로축=공간 격자
 * - character : 세로축=시간, 가로축=인물 격자
 */
export type TimelineViewMode = "all" | "place" | "character";

type TimelineViewState = {
  viewMode: TimelineViewMode;
  setViewMode: (mode: TimelineViewMode) => void;
};

export const useTimelineViewStore = create<TimelineViewState>((set) => ({
  viewMode: "all",
  setViewMode: (mode) => set({ viewMode: mode }),
}));
