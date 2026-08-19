"use client";

import { useState } from "react";

import type { EventItem } from "@/lib/api/types";
import { richTextToPlainText } from "@/components/ui/RichTextEditor";

type EventCardListProps = {
  /** 작중 시간순(sort_key)으로 정렬된 사건들 */
  events: EventItem[];
  onSelectEvent: (eventId: number) => void;
  /** 드래그로 순서를 바꿨을 때. 제자리면 호출되지 않는다. */
  onReorder: (eventId: number, toIndex: number) => void;
};

const DEFAULT_EVENT_COLOR = "#64748b";

/**
 * "전체" 탭의 표시 형식. 축(공간/인물)으로 나누지 않고 모든 사건을
 * 작중 시간순 카드 목록으로 늘어놓는다.
 *
 * 카드를 끌어 순서를 바꿀 수 있다. HTML5 드래그는 터치와 키보드로는 쓸 수
 * 없으므로, 사건 수정 팝업의 "작중 순서" 선택이 그대로 대체 경로로 남아 있다.
 */
export function EventCardList({
  events,
  onSelectEvent,
  onReorder,
}: EventCardListProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  /**
   * 삽입선을 그릴 자리. 화면에 보이는 목록 기준의 "틈" 번호로,
   * 0이면 첫 카드 앞이고 events.length면 마지막 카드 뒤다.
   *
   * 화면 기준으로 두는 이유: 삽입선을 그릴 때와 서버로 보낼 때 기준이 다르면
   * 한 카드에 선이 두 개 그려지는 식으로 어긋난다. 여기서는 화면 기준 하나만
   * 들고 있다가, 놓는 순간에 한 번만 변환한다.
   */
  const [dropGap, setDropGap] = useState<number | null>(null);

  /** 카드의 위/아래 절반 중 어디에 있는지로 삽입할 틈을 정한다 */
  function gapForPointer(e: React.DragEvent, cardIndex: number): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const isBottomHalf = e.clientY > rect.top + rect.height / 2;
    return isBottomHalf ? cardIndex + 1 : cardIndex;
  }

  function handleDrop() {
    if (draggingId !== null && dropGap !== null) {
      // 끌던 항목을 빼고 나면 뒤쪽 자리는 하나씩 당겨진다.
      const fromIndex = events.findIndex((ev) => ev.id === draggingId);
      const toIndex =
        fromIndex !== -1 && fromIndex < dropGap ? dropGap - 1 : dropGap;
      onReorder(draggingId, toIndex);
    }
    setDraggingId(null);
    setDropGap(null);
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 sm:px-6">
      <ul
        className="mx-auto flex max-w-3xl flex-col gap-2"
        onDragLeave={(e) => {
          // 목록 바깥으로 나갔을 때만 삽입선을 지운다(자식 간 이동은 무시).
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDropGap(null);
          }
        }}
      >
        {events.map((event, index) => {
          const preview = event.description
            ? richTextToPlainText(event.description)
            : "";
          const isDragging = draggingId === event.id;

          return (
            <li
              key={event.id}
              draggable
              onDragStart={(e) => {
                setDraggingId(event.id);
                e.dataTransfer.effectAllowed = "move";
                // Firefox는 데이터가 설정돼야 드래그를 시작한다.
                e.dataTransfer.setData("text/plain", String(event.id));
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropGap(null);
              }}
              onDragOver={(e) => {
                if (draggingId === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropGap(gapForPointer(e, index));
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop();
              }}
              className={isDragging ? "opacity-40" : ""}
            >
              {/* 이 카드 바로 앞에 놓인다는 표시 */}
              {draggingId !== null && dropGap === index && (
                <div className="mb-1 h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
              )}

              <button
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="w-full cursor-grab rounded-lg border border-zinc-200 border-l-4 px-4 py-3 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50 active:cursor-grabbing dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                style={{ borderLeftColor: event.color ?? DEFAULT_EVENT_COLOR }}
              >
                <p className="text-xs text-zinc-500">{event.displayTime}</p>
                <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">
                  {event.title}
                </p>

                {preview && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {preview}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-1">
                  {event.places.map((p) => (
                    <span
                      key={`place-${p.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </span>
                  ))}
                  {event.characters.map((c) => (
                    <span
                      key={`character-${c.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  ))}
                </div>
              </button>

              {/* 마지막 카드 뒤에 놓는 경우 (틈 번호가 목록 길이와 같을 때) */}
              {draggingId !== null &&
                index === events.length - 1 &&
                dropGap === events.length && (
                  <div className="mt-1 h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
                )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
