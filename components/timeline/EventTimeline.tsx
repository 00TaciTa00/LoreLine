"use client";

import { useEffect, useRef } from "react";
import { DataSet } from "vis-data";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.css";

import type { Character, EventItem, Place } from "@/lib/api/types";
import { computeLaneItems, computeLanes } from "@/lib/timeline/lanes";
import type { TimelineViewMode } from "@/store/useTimelineViewStore";

/**
 * vis-timeline은 실제 날짜(Date) 축 위에 그리는 컴포넌트다. 가상 시간축인
 * Event.sort_key를 임의의 기준 시각(EPOCH) + 오프셋(ms)으로 매핑해
 * "정렬 순서와 상대적 간격"만 시각적으로 재현하고, 실제 캘린더 날짜 축
 * 레이블은 의미가 없으므로 숨긴다. 화면에 노출되는 시간 라벨은 항상
 * Event.displayTime(자유 형식 문자열)이다.
 */
const RENDER_EPOCH = new Date("2000-01-01T00:00:00Z").getTime();

type EventTimelineProps = {
  events: EventItem[];
  places: Place[];
  characters: Character[];
  viewMode: TimelineViewMode;
  onSelectEvent: (eventId: number) => void;
};

export function EventTimeline({
  events,
  places,
  characters,
  viewMode,
  onSelectEvent,
}: EventTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const onSelectRef = useRef(onSelectEvent);

  useEffect(() => {
    onSelectRef.current = onSelectEvent;
  }, [onSelectEvent]);

  useEffect(() => {
    if (!containerRef.current) return;

    const lanes = computeLanes(viewMode, places, characters);
    const laneItems = computeLaneItems(viewMode, events);

    const groups = new DataSet(
      lanes.map((lane) => ({
        id: lane.id,
        content: `<span class="inline-flex items-center gap-1.5"><span style="background-color:${lane.color}" class="inline-block h-2 w-2 rounded-full"></span>${lane.label}</span>`,
      })),
    );

    const items = new DataSet(
      laneItems.map((item, idx) => ({
        id: `${item.event.id}-${item.laneId}-${idx}`,
        group: item.laneId,
        content: item.event.title,
        title: `${item.event.displayTime} · ${item.event.title}`,
        start: new Date(RENDER_EPOCH + Number(BigInt(item.event.sortKey))),
        className: "loreline-timeline-item",
        style: `background-color:${item.color}33; border-color:${item.color}; color: inherit;`,
        eventId: item.event.id,
      })),
    );

    const timeline = new Timeline(containerRef.current, items, groups, {
      showCurrentTime: false,
      zoomable: true,
      selectable: true,
      showMajorLabels: false,
      showMinorLabels: false,
      orientation: "top",
      groupOrder: "content",
      margin: { item: { horizontal: 12, vertical: 8 } },
    });

    timeline.on("select", (props: { items: string[] }) => {
      const [selectedId] = props.items;
      if (selectedId === undefined) return;
      const item = items.get(selectedId) as { eventId?: number } | null;
      if (item?.eventId !== undefined) onSelectRef.current(item.eventId);
    });

    timelineRef.current = timeline;

    return () => {
      timeline.destroy();
      timelineRef.current = null;
    };
  }, [events, places, characters, viewMode]);

  return <div ref={containerRef} className="h-full w-full" />;
}
