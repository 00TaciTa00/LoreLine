import { create } from "zustand";

/**
 * 타임라인 뷰 전환(전체/공간별/인물별) 같은 클라이언트 전용 UI 상태.
 * 서버 데이터(World/Event/Place/Character)는 React Query가 담당한다.
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
