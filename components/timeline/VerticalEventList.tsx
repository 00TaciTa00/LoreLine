"use client";

import type { Character, EventItem, Place } from "@/lib/api/types";
import { computeLaneItems, computeLanes, type LaneItem } from "@/lib/timeline/lanes";
import type { TimelineViewMode } from "@/store/useTimelineViewStore";

type VerticalEventListProps = {
  events: EventItem[];
  places: Place[];
  characters: Character[];
  viewMode: TimelineViewMode;
  onSelectEvent: (eventId: number) => void;
};

/**
 * vis-timeline 대신 사용하는 세로 스윔레인 뷰. 레인(전체/공간/인물)마다
 * 세로 섹션으로 쌓아 나란한 사건들도 스크롤만으로 가독성 있게 확인할 수 있다.
 *
 * 좁은 화면에서는 자동으로 이 뷰가 쓰이고, 넓은 화면에서도 방향 토글로
 * 선택할 수 있다. 넓은 화면에서 줄이 과도하게 길어지지 않도록 최대 폭을 둔다.
 */
export function VerticalEventList({
  events,
  places,
  characters,
  viewMode,
  onSelectEvent,
}: VerticalEventListProps) {
  const lanes = computeLanes(viewMode, places, characters);
  const laneItems = computeLaneItems(viewMode, events);

  const itemsByLane = new Map<string, LaneItem[]>();
  for (const item of laneItems) {
    const list = itemsByLane.get(item.laneId) ?? [];
    list.push(item);
    itemsByLane.set(item.laneId, list);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6">
      {lanes.map((lane) => {
        const items = itemsByLane.get(lane.id) ?? [];
        return (
          <section key={lane.id}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: lane.color }}
              />
              {lane.label}
            </h3>
            <ol
              className="flex flex-col gap-2 border-l-2 pl-4"
              style={{ borderColor: lane.color }}
            >
              {items.length === 0 && (
                <li className="text-sm text-zinc-400">사건 없음</li>
              )}
              {items.map((item) => (
                <li key={`${item.event.id}-${lane.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(item.event.id)}
                    className="w-full rounded p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <p className="text-xs text-zinc-500">
                      {item.event.displayTime}
                    </p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {item.event.title}
                    </p>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
