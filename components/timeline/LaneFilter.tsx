"use client";

import { useState } from "react";

import type { Lane } from "@/lib/timeline/lanes";

type LaneFilterProps = {
  lanes: Lane[];
  counts: Map<string, number>;
  hiddenLaneIds: Set<string>;
  onToggle: (laneId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  label: string;
};

/**
 * 어떤 인물/공간 열을 보여줄지 고르는 필터. 열이 많아지면 격자가 가로로
 * 길어지므로, 보고 싶은 축만 남길 수 있어야 한다.
 */
export function LaneFilter({
  lanes,
  counts,
  hiddenLaneIds,
  onToggle,
  onShowAll,
  onHideAll,
  label,
}: LaneFilterProps) {
  const [open, setOpen] = useState(false);
  const visibleCount = lanes.length - hiddenLaneIds.size;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        {label} 필터 ({visibleCount}/{lanes.length})
      </button>

      {open && (
        <>
          {/* 바깥을 누르면 닫힌다 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-80 w-60 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-1 flex gap-1 border-b border-zinc-100 pb-1 dark:border-zinc-800">
              <button
                type="button"
                onClick={onShowAll}
                className="flex-1 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={onHideAll}
                className="flex-1 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                전체 해제
              </button>
            </div>

            {lanes.length === 0 && (
              <p className="p-2 text-sm text-zinc-500">등록된 {label}이 없습니다.</p>
            )}

            {lanes.map((lane) => (
              <label
                key={lane.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={!hiddenLaneIds.has(lane.id)}
                  onChange={() => onToggle(lane.id)}
                />
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: lane.color }}
                />
                <span className="min-w-0 flex-1 truncate">{lane.label}</span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {counts.get(lane.id) ?? 0}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
