"use client";

import { useState } from "react";

import { EntityChip } from "@/components/ui/EntityChip";
import type { EventItem } from "@/lib/api/types";
import { buildGrid } from "@/lib/timeline/grid";
import type { Lane } from "@/lib/timeline/lanes";

type TimelineGridProps = {
  events: EventItem[];
  lanes: Lane[];
  axis: "place" | "character";
  hiddenLaneIds: Set<string>;
  onSelectEvent: (eventId: number) => void;
  /** 행 사이 틈(0=첫 행 앞)으로 사건을 옮겼을 때 */
  onReorder: (eventId: number, gapIndex: number) => void;
};

/** 시간 라벨이 들어가는 왼쪽 고정 열 너비 */
const TIME_COL = "10rem";
/** 각 레인 열의 최소 너비 (좁아지면 가로 스크롤) */
const LANE_COL = "13rem";
/**
 * 카드에 바로 보여줄 공간·인물 칩 개수.
 *
 * 열이 좁아 다 펼치면 카드가 세로로 길어지고, 한 줄로 이으면 가로로
 * 넘친다. 넘치는 만큼은 "+N"으로 접어두고 눌러서 펼치게 한다.
 */
const CHIP_LIMIT = 3;

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
  onReorder,
}: TimelineGridProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  /** 삽입선을 그릴 행 사이 틈. 0이면 첫 행 앞, rows.length면 마지막 행 뒤. */
  const [dropGap, setDropGap] = useState<number | null>(null);
  /** 딸린 공간·인물 칩을 모두 펼쳐 둔 사건들 */
  const [expandedChipIds, setExpandedChipIds] = useState<Set<number>>(
    () => new Set(),
  );

  function toggleChips(eventId: number) {
    setExpandedChipIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(eventId)) next.add(eventId);
      return next;
    });
  }

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
        {/*
          열 머리글: 세로 스크롤해도 계속 보이도록 고정.
          본문의 시각 열도 고정되므로(아래) 층위가 겹친다. 머리글이 z-20으로
          더 위에 있어야 세로로 스크롤할 때 시각 칸이 머리글을 덮지 않는다.
        */}
        <div
          className="sticky top-0 z-20 grid border-b border-zinc-200 bg-background dark:border-zinc-800"
          style={{ gridTemplateColumns }}
        >
          {/* 좌상단 모서리: 가로·세로 양쪽으로 고정된다 */}
          <div className="sticky left-0 z-10 border-r border-zinc-100 bg-background px-3 py-2 text-xs font-medium text-zinc-400 dark:border-zinc-800">
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
          <div key={`${row.key}-${rowIndex}`}>
            {/* 이 행 앞에 놓인다는 표시 */}
            {draggingId !== null && dropGap === rowIndex && (
              <div className="h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
            )}

          <div
            className="grid border-b border-zinc-100 dark:border-zinc-800"
            style={{ gridTemplateColumns }}
            onDragOver={(e) => {
              if (draggingId === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              // 행의 위/아래 절반 중 어디에 있는지로 삽입할 틈을 정한다.
              // 어느 열에 놓든 행 위치만 본다(가로 이동은 순서와 무관).
              const rect = e.currentTarget.getBoundingClientRect();
              const isBottomHalf = e.clientY > rect.top + rect.height / 2;
              setDropGap(isBottomHalf ? rowIndex + 1 : rowIndex);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggingId !== null && dropGap !== null) {
                onReorder(draggingId, dropGap);
              }
              setDraggingId(null);
              setDropGap(null);
            }}
          >
            {/*
              가로로 스크롤해도 지금 보는 사건이 언제 일인지 알 수 있도록 고정.
              배경색을 직접 줘야 한다. 없으면 밑을 지나가는 카드가 글자에
              겹쳐 보인다.
            */}
            <div className="sticky left-0 z-10 border-r border-zinc-100 bg-background px-3 py-3 dark:border-zinc-800">
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
                      <EventCard
                        key={event.id}
                        event={event}
                        axis={axis}
                        laneColor={lane.color}
                        isDragging={draggingId === event.id}
                        isExpanded={expandedChipIds.has(event.id)}
                        onToggleChips={() => toggleChips(event.id)}
                        onOpen={() => onSelectEvent(event.id)}
                        onDragStart={(e) => {
                          setDraggingId(event.id);
                          e.dataTransfer.effectAllowed = "move";
                          // Firefox는 데이터가 있어야 드래그를 시작한다.
                          e.dataTransfer.setData("text/plain", String(event.id));
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropGap(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

            {/* 마지막 행 뒤에 놓는 경우 */}
            {draggingId !== null &&
              rowIndex === rows.length - 1 &&
              dropGap === rows.length && (
                <div className="h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
              )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 격자 한 칸에 들어가는 사건 카드.
 *
 * 카드 전체가 <button>이면 "+N"을 안에 넣을 수 없다(버튼 중첩). 카드는
 * 끌기만 맡는 <div>로 두고, 제목과 "+N"을 각각 버튼으로 둔다.
 */
function EventCard({
  event,
  axis,
  laneColor,
  isDragging,
  isExpanded,
  onToggleChips,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  event: EventItem;
  axis: "place" | "character";
  laneColor: string;
  isDragging: boolean;
  isExpanded: boolean;
  onToggleChips: () => void;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  // 격자의 축이 아닌 쪽을 곁들여 맥락을 준다.
  // 공간별 격자에는 인물을, 인물별 격자에는 공간을 보여준다.
  const related: { id: number; name: string; color: string }[] =
    axis === "place" ? event.characters : event.places;
  const hiddenCount = Math.max(0, related.length - CHIP_LIMIT);
  const shown = isExpanded ? related : related.slice(0, CHIP_LIMIT);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded border-l-4 bg-zinc-50 px-2 py-1.5 transition-colors hover:bg-zinc-100 active:cursor-grabbing dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
        isDragging ? "opacity-40" : ""
      }`}
      style={{ borderLeftColor: event.color ?? laneColor }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left text-sm font-medium text-zinc-900 dark:text-zinc-50"
      >
        {event.title}
      </button>

      {related.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {shown.map((entity) => (
            <EntityChip key={entity.id} name={entity.name} color={entity.color} />
          ))}

          {(hiddenCount > 0 || isExpanded) && (
            <button
              type="button"
              onClick={onToggleChips}
              aria-expanded={isExpanded}
              className="shrink-0 rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
            >
              {isExpanded ? "접기" : `+${hiddenCount}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
