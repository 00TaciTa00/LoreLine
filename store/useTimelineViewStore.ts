import { create } from "zustand";

/**
 * 타임라인 뷰 관련 클라이언트 전용 UI 상태.
 * 서버 데이터(World/Event/Place/Character)는 React Query가 담당한다.
 */
export type TimelineViewMode = "all" | "place" | "character";

/** 연표를 가로(vis-timeline)로 볼지 세로(리스트)로 볼지 */
export type TimelineOrientation = "horizontal" | "vertical";

type TimelineViewState = {
  viewMode: TimelineViewMode;
  orientation: TimelineOrientation;
  setViewMode: (mode: TimelineViewMode) => void;
  setOrientation: (orientation: TimelineOrientation) => void;
};

export const useTimelineViewStore = create<TimelineViewState>((set) => ({
  viewMode: "all",
  orientation: "horizontal",
  setViewMode: (mode) => set({ viewMode: mode }),
  setOrientation: (orientation) => set({ orientation }),
}));
