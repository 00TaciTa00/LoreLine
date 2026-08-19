"use client";

import { useSyncExternalStore } from "react";

/**
 * vis-timeline은 가로 스크롤 타임라인이라 좁은 화면에서 스윔레인 가독성이
 * 떨어진다. 브레이크포인트 아래에서는 세로 리스트 뷰로 전환하기 위한 훅.
 *
 * useSyncExternalStore를 쓰는 이유: 렌더 중에 window.matchMedia를 읽으면
 * 서버 렌더(항상 false)와 클라이언트 첫 렌더(좁은 화면이면 true)가 어긋나
 * 하이드레이션 불일치가 난다. React가 이를 patch하지 않아 disabled 같은
 * 속성이 잘못된 채로 남는다. 이 훅은 서버 스냅샷을 따로 받아 그 문제를 없앤다.
 */
const NARROW_BREAKPOINT_PX = 640;
const MEDIA_QUERY = `(max-width: ${NARROW_BREAKPOINT_PX}px)`;

function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(MEDIA_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(MEDIA_QUERY).matches;
}

/** 서버에는 뷰포트가 없으므로 넓은 화면(가로 연표)을 가정한다. */
function getServerSnapshot(): boolean {
  return false;
}

export function useIsNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
