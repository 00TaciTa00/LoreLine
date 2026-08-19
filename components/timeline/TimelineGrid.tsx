"use client";

import type { EventItem } from "@/lib/api/types";
import { buildGrid } from "@/lib/timeline/grid";
import type { Lane } from "@/lib/timeline/lanes";

type TimelineGridProps = {
  events: EventItem[];
  lanes: Lane[];
  axis: "place" | "character";
  hiddenLaneIds: Set<string>;
  onSelectEvent: (eventId: number) => void;
};

/** 시간 라벨이 들어가는 왼쪽 고정 열 너비 */
const TIME_COL = "10rem";
/** 각 레인 열의 최소 너비 (좁아지면 가로 스크롤) */
const LANE_COL = "13rem";

/**
 * 세로축=시간(위→아래), 가로축=인물/공간 격자.
 *
 * vis-timeline은 시간축이 가로로 고정이라 이 배치를 만들 수 없어 CSS Grid로
 * 직접 그린다. 같은 작중 시각의 사건은 한 행에 묶여 가로로 나란히 보인다.
 */
export function TimelineGrid({
  events,
  lanes,
  axis,
  hiddenLaneIds,
  onSelectEvent,
}: TimelineGridProps) {
  const visibleLanes = lanes.filter((l) => !hiddenLaneIds.has(l.id));
  const visibleLaneIds = new Set(visibleLanes.map((l) => l.id));
  const rows = buildGrid(events, axis, visibleLaneIds);

  if (visibleLanes.length === 0) {
    return (
      <p className="p-6 text-sm text-zinc-500">
        표시할 열이 없습니다. 필터에서 {axis === "place" ? "공간" : "인물"}을
        하나 이상 선택하세요.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="p-6 text-sm text-zinc-500">
        선택한 열에 해당하는 사건이 없습니다.
      </p>
    );
  }

  const gridTemplateColumns = `${TIME_COL} repeat(${visibleLanes.length}, minmax(${LANE_COL}, 1fr))`;

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-max">
        {/* 열 머리글: 세로 스크롤해도 계속 보이도록 고정 */}
        <div
          className="sticky top-0 z-10 grid border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
          style={{ gridTemplateColumns }}
        >
          <div className="border-r border-zinc-100 px-3 py-2 text-xs font-medium text-zinc-400 dark:border-zinc-800">
            작중 시각
          </div>
          {visibleLanes.map((lane) => (
            <div
              key={lane.id}
              className="border-r border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: lane.color }}
                />
                <span className="truncate">{lane.label}</span>
              </span>
            </div>
          ))}
        </div>

        {/* 시간 행 */}
        {rows.map((row, rowIndex) => (
          <div
            key={`${row.displayTime}-${rowIndex}`}
            className="grid border-b border-zinc-100 dark:border-zinc-800"
            style={{ gridTemplateColumns }}
          >
            <div className="border-r border-zinc-100 px-3 py-3 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {row.displayTime}
              </p>
            </div>

            {visibleLanes.map((lane) => {
              const cell = row.cells.get(lane.id) ?? [];
              return (
                <div
                  key={lane.id}
                  className="border-r border-zinc-100 px-2 py-2 dark:border-zinc-800"
                >
                  <div className="flex flex-col gap-1.5">
                    {cell.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event.id)}
                        className="w-full rounded border-l-4 bg-zinc-50 px-2 py-1.5 text-left transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        style={{ borderLeftColor: event.color ?? lane.color }}
                      >
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {event.title}
                        </p>
                        {/* 다른 축의 정보를 한 줄로 곁들여 맥락을 준다 */}
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {axis === "place"
                            ? event.characters.map((c) => c.name).join(", ")
                            : event.places.map((p) => p.name).join(", ")}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
