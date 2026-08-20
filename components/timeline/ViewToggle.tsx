"use client";

import type { TimelineViewMode } from "@/store/useTimelineViewStore";

const OPTIONS: { value: TimelineViewMode; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "era", label: "시간별" },
  { value: "place", label: "공간별" },
  { value: "character", label: "인물별" },
];

type ViewToggleProps = {
  value: TimelineViewMode;
  onChange: (mode: TimelineViewMode) => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
