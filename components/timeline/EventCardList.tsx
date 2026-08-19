"use client";

import type { EventItem } from "@/lib/api/types";
import { richTextToPlainText } from "@/components/ui/RichTextEditor";

type EventCardListProps = {
  /** 작중 시간순(sort_key)으로 정렬된 사건들 */
  events: EventItem[];
  onSelectEvent: (eventId: number) => void;
};

const DEFAULT_EVENT_COLOR = "#64748b";

/**
 * "전체" 탭의 표시 형식. 축(공간/인물)으로 나누지 않고 모든 사건을
 * 작중 시간순 카드 목록으로 늘어놓는다.
 */
export function EventCardList({ events, onSelectEvent }: EventCardListProps) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4 sm:px-6">
      <ul className="mx-auto flex max-w-3xl flex-col gap-2">
        {events.map((event) => {
          const preview = event.description
            ? richTextToPlainText(event.description)
            : "";

          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="w-full rounded-lg border border-zinc-200 border-l-4 px-4 py-3 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
