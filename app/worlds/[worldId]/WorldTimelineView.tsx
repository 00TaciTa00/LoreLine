"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EventFormModal } from "@/components/timeline/EventFormModal";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { LaneFilter } from "@/components/timeline/LaneFilter";
import { OrientationToggle } from "@/components/timeline/OrientationToggle";
import { TimelineGrid } from "@/components/timeline/TimelineGrid";
import { VerticalEventList } from "@/components/timeline/VerticalEventList";
import { ViewToggle } from "@/components/timeline/ViewToggle";
import { laneEventCounts } from "@/lib/timeline/grid";
import { computeLanes } from "@/lib/timeline/lanes";
import type { EventItem } from "@/lib/api/types";
import { useIsNarrowScreen } from "@/lib/hooks/useIsNarrowScreen";
import { useCharacters } from "@/lib/query/characters";
import { useEvents } from "@/lib/query/events";
import { usePlaces } from "@/lib/query/places";
import { useTimelineViewStore } from "@/store/useTimelineViewStore";

export function WorldTimelineView() {
  const params = useParams<{ worldId: string }>();
  const worldId = Number(params.worldId);
  const searchParams = useSearchParams();

  const { data: events, isLoading: eventsLoading } = useEvents(worldId);
  const { data: places } = usePlaces(worldId);
  const { data: characters } = useCharacters(worldId);
  const { viewMode, setViewMode, orientation, setOrientation } =
    useTimelineViewStore();
  const isNarrow = useIsNarrowScreen();
  // 좁은 화면에서는 가로 연표의 가독성이 떨어져 세로를 강제한다.
  const showVertical = isNarrow || orientation === "vertical";

  const [modalEvent, setModalEvent] = useState<EventItem | "new" | null>(null);

  // 격자에서 숨긴 열. 공간축과 인물축이 서로 독립적으로 기억되도록 나눠 둔다.
  const [hiddenPlaceIds, setHiddenPlaceIds] = useState<Set<string>>(new Set());
  const [hiddenCharacterIds, setHiddenCharacterIds] = useState<Set<string>>(
    new Set(),
  );

  // 세로 + 공간별/인물별이면 격자(세로축=시간, 가로축=열)로 그린다.
  const gridAxis =
    showVertical && viewMode !== "all"
      ? (viewMode as "place" | "character")
      : null;

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

  // 교차 탐색: 공간/인물 목록 페이지에서 ?eventId=로 넘어오면 해당 사건을 바로 연다.
  // (렌더 중 상태를 조정하는 패턴 - eventIdParam이 바뀔 때만 한 번 실행되도록
  // handledEventIdParam으로 가드한다: https://react.dev/learn/you-might-not-need-an-effect)
  const [handledEventIdParam, setHandledEventIdParam] = useState<string | null>(
    null,
  );
  const eventIdParam = searchParams.get("eventId");
  if (eventIdParam && eventIdParam !== handledEventIdParam && events) {
    const found = events.find((e) => e.id === Number(eventIdParam));
    if (found) {
      setHandledEventIdParam(eventIdParam);
      setModalEvent(found);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <OrientationToggle
            value={orientation}
            onChange={setOrientation}
            forcedVertical={isNarrow}
          />
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
        ) : showVertical ? (
          <VerticalEventList
            events={events ?? []}
            places={places ?? []}
            characters={characters ?? []}
            viewMode={viewMode}
            onSelectEvent={(id) =>
              setModalEvent(events?.find((e) => e.id === id) ?? null)
            }
          />
        ) : (
          <EventTimeline
            events={events ?? []}
            places={places ?? []}
            characters={characters ?? []}
            viewMode={viewMode}
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
