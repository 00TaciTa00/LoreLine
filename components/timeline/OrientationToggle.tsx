"use client";

import type { TimelineOrientation } from "@/store/useTimelineViewStore";

const OPTIONS: { value: TimelineOrientation; label: string }[] = [
  { value: "horizontal", label: "가로" },
  { value: "vertical", label: "세로" },
];

type OrientationToggleProps = {
  value: TimelineOrientation;
  onChange: (orientation: TimelineOrientation) => void;
  /**
   * 좁은 화면에서는 가로 연표의 가독성이 떨어져 세로가 강제된다.
   * 이때 토글은 비활성화하고 이유를 알려준다.
   */
  forcedVertical?: boolean;
};

export function OrientationToggle({
  value,
  onChange,
  forcedVertical = false,
}: OrientationToggleProps) {
  return (
    <div
      className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800"
      title={forcedVertical ? "좁은 화면에서는 세로로 표시됩니다" : undefined}
    >
      {OPTIONS.map((opt) => {
        const active = forcedVertical
          ? opt.value === "vertical"
          : value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={forcedVertical}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
