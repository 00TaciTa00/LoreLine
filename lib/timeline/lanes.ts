import type { Character, EventItem, Place } from "@/lib/api/types";
import type { TimelineViewMode } from "@/store/useTimelineViewStore";

export type Lane = { id: string; label: string; color: string };

export function computeLanes(
  viewMode: TimelineViewMode,
  places: Place[],
  characters: Character[],
): Lane[] {
  if (viewMode === "place") {
    return places.map((p) => ({ id: `place-${p.id}`, label: p.name, color: p.color }));
  }
  if (viewMode === "character") {
    return characters.map((c) => ({
      id: `character-${c.id}`,
      label: c.name,
      color: c.color,
    }));
  }
  return [{ id: "all", label: "전체", color: "#64748b" }];
}

export type LaneItem = { laneId: string; event: EventItem; color: string };

const DEFAULT_EVENT_COLOR = "#64748b";

/**
 * 뷰 모드에 따라 사건을 레인에 배치한다. 공간별/인물별 뷰에서는 하나의
 * 사건이 여러 공간/인물에 걸쳐 있으면 각 레인에 중복 배치되어 동시간대
 * 병렬 사건을 스윔레인으로 확인할 수 있다.
 */
export function computeLaneItems(
  viewMode: TimelineViewMode,
  events: EventItem[],
): LaneItem[] {
  const items: LaneItem[] = [];

  for (const ev of events) {
    if (viewMode === "place") {
      for (const p of ev.places) {
        items.push({ laneId: `place-${p.id}`, event: ev, color: p.color });
      }
    } else if (viewMode === "character") {
      for (const c of ev.characters) {
        items.push({ laneId: `character-${c.id}`, event: ev, color: c.color });
      }
    } else {
      items.push({ laneId: "all", event: ev, color: ev.color ?? DEFAULT_EVENT_COLOR });
    }
  }

  return items;
}
