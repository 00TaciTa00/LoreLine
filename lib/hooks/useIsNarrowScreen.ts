"use client";

import { useEffect, useState } from "react";

/**
 * vis-timeline은 가로 스크롤 타임라인이라 좁은 화면에서 스윔레인 가독성이
 * 떨어진다. 브레이크포인트 아래에서는 세로 리스트 뷰로 전환하기 위한 훅.
 */
const NARROW_BREAKPOINT_PX = 640;

function getIsNarrow(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${NARROW_BREAKPOINT_PX}px)`).matches;
}

export function useIsNarrowScreen(): boolean {
  const [isNarrow, setIsNarrow] = useState(getIsNarrow);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT_PX}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isNarrow;
}
