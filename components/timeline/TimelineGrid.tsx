"use client";

import { useState } from "react";

import { EntityChip } from "@/components/ui/EntityChip";
import type { EventItem } from "@/lib/api/types";
import { buildGrid } from "@/lib/timeline/grid";
import { laneLifespans, layoutRow } from "@/lib/timeline/grid-layout";
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
 *
 * 3개였을 때는 이름이 조금만 길어도 13rem 열에서 두 줄로 넘어가 카드 높이가
 * 들쭉날쭉했다. 2개면 대개 한 줄에 들어간다.
 */
const CHIP_LIMIT = 2;

/**
 * 세로축=시간(위→아래), 가로축=인물/공간 격자.
 *
 * vis-timeline은 시간축이 가로로 고정이라 이 배치를 만들 수 없어 CSS Grid로
 * 직접 그린다. 같은 작중 시각의 사건은 한 행에 묶여 가로로 나란히 보인다.
 *
 * 한 사건이 여러 열에 걸치면 **카드 한 장이 그 구간을 가로지른다.** 전에는
 * 열마다 복제돼 같은 제목이 여러 번 읽혔고, 둘이 같은 자리에 있었다는 사실이
 * 화면에 남지 않았다. 가로지르느라 가운데 열을 덮는 문제는 행을 단으로 나눠
 * 푼다(lib/timeline/grid-layout.ts).
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

  const laneIds = visibleLanes.map((l) => l.id);
  const gridTemplateColumns = `${TIME_COL} repeat(${visibleLanes.length}, minmax(${LANE_COL}, 1fr))`;
  // 열마다 첫 등장 ~ 마지막 등장 구간. 흐름선을 이 사이에만 긋는다.
  const lifespans = laneLifespans(rows, laneIds);

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-max">
        {/*
          열 머리글: 세로 스크롤해도 계속 보이도록 고정.
          본문의 시각 열도 고정되므로(아래) 층위가 겹친다. 머리글이 z-30으로
          더 위에 있어야 세로로 스크롤할 때 시각 칸이 머리글을 덮지 않는다.
        */}
        <div
          className="sticky top-0 z-30 grid border-b border-zinc-200 bg-background dark:border-zinc-800"
          style={{ gridTemplateColumns }}
        >
          {/* 좌상단 모서리: 가로·세로 양쪽으로 고정된다 */}
          <div className="sticky left-0 z-10 border-l-4 border-l-transparent border-r border-zinc-100 bg-background px-3 py-2 text-xs font-medium text-zinc-400 dark:border-zinc-800">
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
        {rows.map((row, rowIndex) => {
          const { placements, trackCount } = layoutRow(row, laneIds);

          return (
            <div key={`${row.key}-${rowIndex}`}>
              {/* 이 행 앞에 놓인다는 표시 */}
              {draggingId !== null && dropGap === rowIndex && (
                <div className="h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
              )}

              <div
                className="grid border-b border-zinc-100 dark:border-zinc-800"
                style={{
                  gridTemplateColumns,
                  // 단 수만큼 줄을 만든다. 가로로 겹친 사건이 아래로 내려간다.
                  gridTemplateRows: `repeat(${trackCount}, auto)`,
                }}
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
                  가로로 스크롤해도 지금 보는 사건이 언제 일인지 알 수 있도록
                  고정. 배경색을 직접 줘야 한다. 없으면 밑을 지나가는 카드가
                  글자에 겹쳐 보인다.

                  왼쪽 색 띠는 이 행이 어느 상위 기간에 속하는지 나타낸다.
                  기간이 없어도 띠 자리는 비워 두지 않고 투명하게 남긴다. 안
                  그러면 기간이 있는 행과 글자 시작 위치가 4px 어긋난다.

                  단이 여러 개여도 시각은 한 번만 쓰므로 세로로 전부 관통한다.
                */}
                <div
                  className="sticky left-0 z-20 border-l-4 border-r border-zinc-100 bg-background px-3 py-3 dark:border-zinc-800"
                  style={{
                    borderLeftColor: row.eraColor ?? "transparent",
                    gridColumn: 1,
                    gridRow: "1 / -1",
                  }}
                >
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {row.displayTime}
                  </p>
                </div>

                {/*
                  열 배경. 구분선과 흐름선만 그리고 카드는 그 위에 따로 놓는다.
                  카드가 여러 열을 가로지르므로 칸 안에 넣을 수 없기 때문이다.
                */}
                {visibleLanes.map((lane, laneIndex) => (
                  <LaneBackground
                    key={`bg-${lane.id}`}
                    color={lane.color}
                    column={laneIndex + 2}
                    trackCount={trackCount}
                    lifespan={lifespans.get(lane.id)}
                    rowIndex={rowIndex}
                  />
                ))}

                {/* 사건 카드 */}
                {placements.map((placement) => (
                  <div
                    key={placement.event.id}
                    className="relative z-10 px-2 py-2"
                    style={{
                      // 격자 열 번호는 1부터고 1번은 시각 열이라 +2.
                      gridColumn: `${placement.startLane + 2} / ${
                        placement.endLane + 3
                      }`,
                      gridRow: placement.track + 1,
                    }}
                  >
                    <EventCard
                      event={placement.event}
                      axis={axis}
                      segments={visibleLanes
                        .slice(placement.startLane, placement.endLane + 1)
                        .map((lane, offset) =>
                          placement.laneIndexes.includes(
                            placement.startLane + offset,
                          )
                            ? lane.color
                            : null,
                        )}
                      eraColor={row.eraColor}
                      isDragging={draggingId === placement.event.id}
                      isExpanded={expandedChipIds.has(placement.event.id)}
                      onToggleChips={() => toggleChips(placement.event.id)}
                      onOpen={() => onSelectEvent(placement.event.id)}
                      onDragStart={(e) => {
                        setDraggingId(placement.event.id);
                        e.dataTransfer.effectAllowed = "move";
                        // Firefox는 데이터가 있어야 드래그를 시작한다.
                        e.dataTransfer.setData(
                          "text/plain",
                          String(placement.event.id),
                        );
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropGap(null);
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* 마지막 행 뒤에 놓는 경우 */}
              {draggingId !== null &&
                rowIndex === rows.length - 1 &&
                dropGap === rows.length && (
                  <div className="h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 한 열의 배경. 오른쪽 구분선과 흐름선을 그린다.
 *
 * 흐름선은 그 인물·공간이 처음 나오는 행에서 시작해 마지막 행에서 끝난다.
 * 격자 전체 높이로 그으면 선의 길이가 아무것도 말해주지 않아, 고대에만 있는
 * 인물과 끝까지 가는 인물이 똑같아 보인다. 시작과 끝에는 점을 찍는다.
 */
function LaneBackground({
  color,
  column,
  trackCount,
  lifespan,
  rowIndex,
}: {
  color: string;
  column: number;
  trackCount: number;
  lifespan: { first: number; last: number } | undefined;
  rowIndex: number;
}) {
  const inside =
    lifespan !== undefined &&
    rowIndex >= lifespan.first &&
    rowIndex <= lifespan.last;
  const isFirst = lifespan?.first === rowIndex;
  const isLast = lifespan?.last === rowIndex;

  return (
    <div
      className="relative border-r border-zinc-100 dark:border-zinc-800"
      style={{ gridColumn: column, gridRow: `1 / ${trackCount + 1}` }}
    >
      {inside && (
        <>
          <span
            aria-hidden
            className="absolute left-1/2 w-0.5 -translate-x-1/2 opacity-40"
            style={{
              backgroundColor: color,
              // 첫 행은 중간에서 시작하고 마지막 행은 중간에서 끝난다.
              top: isFirst ? "50%" : 0,
              bottom: isLast ? "50%" : 0,
            }}
          />
          {(isFirst || isLast) && (
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * 격자에 놓이는 사건 카드.
 *
 * 카드 전체가 <button>이면 "+N"을 안에 넣을 수 없다(버튼 중첩). 카드는
 * 끌기만 맡는 <div>로 두고, 제목과 "+N"을 각각 버튼으로 둔다.
 */
function EventCard({
  event,
  axis,
  segments,
  eraColor,
  isDragging,
  isExpanded,
  onToggleChips,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  event: EventItem;
  axis: "place" | "character";
  /**
   * 상단 띠를 열별로 나눈 색. 카드가 덮는 열 수만큼 있고, 참여하지 않는
   * 열은 null이다. 여러 열을 가로지르는 카드가 가운데 낀 열까지 참여한다고
   * 오해받지 않게 한다.
   */
  segments: (string | null)[];
  /** 이 사건이 속한 상위 기간의 색. 기간이 없으면 null. */
  eraColor: string | null;
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
      className={`cursor-grab overflow-hidden rounded border-l-4 bg-zinc-50 transition-colors hover:bg-zinc-100 active:cursor-grabbing dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
        isDragging ? "opacity-40" : ""
      }`}
      // 좌측 띠는 이 행의 상위 기간(시간열) 색.
      style={{ borderLeftColor: eraColor ?? "transparent" }}
    >
      {/*
        상단 띠: 카드가 덮는 열마다 한 칸씩, 참여하는 열에만 색이 있다.
        참여하지 않는 구간을 완전히 비우면 띠가 끊겨 별개의 막대로 보이므로,
        바탕에 옅은 회색을 깔아 한 장이라는 것이 읽히게 한다.
      */}
      <div aria-hidden className="flex h-1 w-full bg-zinc-200 dark:bg-zinc-700">
        {segments.map((segment, index) => (
          <span
            key={index}
            className="flex-1"
            style={{ backgroundColor: segment ?? "transparent" }}
          />
        ))}
      </div>

      <div className="px-2 py-1.5">
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
              <EntityChip
                key={entity.id}
                name={entity.name}
                color={entity.color}
              />
            ))}

            {/*
              접힌 개수가 0이면 버튼을 아예 두지 않는다. 펼쳐 둔 사이에 딸린
              항목이 줄어 0이 될 수 있는데, 그때 "-0"이 남으면 안 된다. 버튼이
              사라져도 칩은 모두 보이는 상태라 갇히지 않는다.
            */}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={onToggleChips}
                aria-expanded={isExpanded}
                // 글자는 "+3"/"-3"처럼 부호와 개수만 둔다. 카드가 좁아 "접기"가
                // 들어가면 칩 한 개 자리를 잡아먹는다. 개수를 붙여 두면 접힌 뒤
                // 무엇이 몇 개 숨는지 미리 알 수 있다.
                // 부호만으로는 뜻이 좁으니 화면 낭독기에는 이름을 따로 준다.
                aria-label={
                  isExpanded
                    ? `${hiddenCount}개 접기`
                    : `${hiddenCount}개 더 보기`
                }
                className="shrink-0 rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
              >
                {isExpanded ? `-${hiddenCount}` : `+${hiddenCount}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
