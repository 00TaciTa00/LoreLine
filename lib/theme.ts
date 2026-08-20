export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "loreline-theme";

/**
 * 첫 페인트 전에 <html>에 .dark를 붙이는 스크립트.
 *
 * React가 붙기 전에 실행돼야 한다. 하이드레이션 이후에 테마를 정하면 밝은
 * 화면이 한 번 번쩍인 뒤 어두워진다.
 *
 * 고른 적이 없으면 OS 설정을 따르고, 고른 뒤에는 저장된 값이 우선한다.
 * 저장소 접근이 막힌 환경(프라이빗 모드 등)에서도 죽지 않도록 감싼다.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

/*
 * 테마는 React 바깥(<html>의 클래스와 localStorage)에 있는 상태다.
 * useSyncExternalStore로 구독해 읽는다. effect에서 setState로 끌어오면
 * 린트에 걸릴 뿐 아니라, 렌더 중에 읽도록 바꾸면 하이드레이션이 깨진다.
 */
const listeners = new Set<() => void>();

export function subscribeTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  // 다른 탭에서 바꾼 경우도 따라간다.
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 실제로 적용된 테마는 <html>의 클래스가 말해준다(초기화 스크립트가 정해둔 값). */
export function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * 서버는 사용자의 선택도 OS 설정도 알 수 없다. null을 돌려주면 화면에
 * 아무것도 그리지 않고, 하이드레이션 뒤 실제 값으로 다시 그린다.
 * (useSyncExternalStore가 지원하는 경로라 불일치 경고가 나지 않는다.)
 */
export function getThemeServerSnapshot(): null {
  return null;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 저장에 실패해도 이번 세션 동안은 적용된 채로 둔다.
  }
  for (const listener of listeners) listener();
}
