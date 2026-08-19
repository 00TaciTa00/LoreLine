"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { EventCardList } from "@/components/timeline/EventCardList";
import { EventFormModal } from "@/components/timeline/EventFormModal";
import { LaneFilter } from "@/components/timeline/LaneFilter";
import { TimelineGrid } from "@/components/timeline/TimelineGrid";
import { ViewToggle } from "@/components/timeline/ViewToggle";
import { laneEventCounts } from "@/lib/timeline/grid";
import { computeLanes } from "@/lib/timeline/lanes";
import type { EventItem } from "@/lib/api/types";
import { useCharacters } from "@/lib/query/characters";
import { useEvents } from "@/lib/query/events";
import { usePlaces } from "@/lib/query/places";
import { useTimelineViewStore } from "@/store/useTimelineViewStore";

export function WorldTimelineView() {
  const params = useParams<{ worldId: string }>();
  const worldId = Number(params.worldId);

  const { data: events, isLoading: eventsLoading } = useEvents(worldId);
  const { data: places } = usePlaces(worldId);
  const { data: characters } = useCharacters(worldId);
  const { viewMode, setViewMode } = useTimelineViewStore();

  const [modalEvent, setModalEvent] = useState<EventItem | "new" | null>(null);

  // 격자에서 숨긴 열. 공간축과 인물축이 서로 독립적으로 기억되도록 나눠 둔다.
  const [hiddenPlaceIds, setHiddenPlaceIds] = useState<Set<string>>(new Set());
  const [hiddenCharacterIds, setHiddenCharacterIds] = useState<Set<string>>(
    new Set(),
  );

  // 공간별/인물별은 항상 격자(세로축=시간, 가로축=공간·인물)로 그린다.
  // 전체는 축 없이 카드 목록으로 늘어놓는다.
  const gridAxis = viewMode === "all" ? null : viewMode;

  const lanes = gridAxis ? computeLanes(gridAxis, places ?? [], characters ?? []) : [];
  const hiddenLaneIds =
    gridAxis === "place" ? hiddenPlaceIds : hiddenCharacterIds;
  const setHiddenLaneIds =
    gridAxis === "place" ? setHiddenPlaceIds : setHiddenCharacterIds;

  function toggleLane(laneId: string) {
    setHiddenLaneIds((prev) => {
      const next = new Set(prev);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {gridAxis && (
            <LaneFilter
              lanes={lanes}
              counts={laneEventCounts(events ?? [], lanes, gridAxis)}
              hiddenLaneIds={hiddenLaneIds}
              onToggle={toggleLane}
              onShowAll={() => setHiddenLaneIds(new Set())}
              onHideAll={() =>
                setHiddenLaneIds(new Set(lanes.map((l) => l.id)))
              }
              label={gridAxis === "place" ? "공간" : "인물"}
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalEvent("new")}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          + 새 사건
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {eventsLoading ? (
          <p className="p-6 text-sm text-zinc-500">불러오는 중...</p>
        ) : events?.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">
            아직 등록된 사건이 없습니다. 공간·인물을 먼저 만든 뒤 사건을
            추가해보세요.
          </p>
        ) : gridAxis ? (
          <TimelineGrid
            events={events ?? []}
            lanes={lanes}
            axis={gridAxis}
            hiddenLaneIds={hiddenLaneIds}
            onSelectEvent={(id) =>
              setModalEvent(events?.find((e) => e.id === id) ?? null)
            }
          />
        ) : (
          <EventCardList
            events={events ?? []}
            onSelectEvent={(id) =>
              setModalEvent(events?.find((e) => e.id === id) ?? null)
            }
          />
        )}
      </div>

      {modalEvent && (
        <EventFormModal
          worldId={worldId}
          event={modalEvent === "new" ? null : modalEvent}
          places={places ?? []}
          characters={characters ?? []}
          events={events ?? []}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  );
}
