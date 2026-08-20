"use client";

import { useSyncExternalStore } from "react";

import {
  applyTheme,
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
} from "@/lib/theme";

/**
 * 라이트/다크 전환 버튼.
 *
 * 실제 테마는 <html>의 클래스에 있고(첫 페인트 전에 초기화 스크립트가 정한다)
 * 여기서는 그걸 구독해 읽기만 한다. 서버는 테마를 알 수 없어 하이드레이션
 * 전까지는 비워두고, 이후 실제 값으로 다시 그린다.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      // 테마를 알기 전에는 눌러도 의미가 없다.
      disabled={theme === null}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="shrink-0 rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-0 dark:hover:bg-zinc-800"
    >
      {theme === null ? "" : isDark ? "☀ 라이트" : "☾ 다크"}
    </button>
  );
}
