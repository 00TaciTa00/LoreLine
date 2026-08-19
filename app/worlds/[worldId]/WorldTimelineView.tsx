"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EventFormModal } from "@/components/timeline/EventFormModal";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { VerticalEventList } from "@/components/timeline/VerticalEventList";
import { ViewToggle } from "@/components/timeline/ViewToggle";
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
  const { viewMode, setViewMode } = useTimelineViewStore();
  const isNarrow = useIsNarrowScreen();

  const [modalEvent, setModalEvent] = useState<EventItem | "new" | null>(null);

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
        <ViewToggle value={viewMode} onChange={setViewMode} />
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
        ) : isNarrow ? (
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
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  );
}
