"use client";

import type { Era, EventItem } from "@/lib/api/types";
import { EntityChip } from "@/components/ui/EntityChip";
import { richTextToPlainText } from "@/components/ui/RichTextEditor";
import { DEFAULT_EVENT_COLOR } from "@/lib/colors";
import { buildEraGroups } from "@/lib/timeline/era-groups";

type EventEraGroupsProps = {
  /** 작중 시간순(sort_key)으로 정렬된 사건들 */
  events: EventItem[];
  /** 시간 탭 순서대로 정렬된 기간들 */
  eras: Era[];
  onSelectEvent: (eventId: number) => void;
};

/**
 * "시간별" 탭의 표시 형식.
 *
 * 공간별·인물별과 달리 격자가 아니다. 상위 기간이 곧 구획이라 한 사건이
 * 한 칸에만 들어가므로, 격자로 그리면 칸이 대각선으로 하나씩만 차서 볼 게
 * 없어진다. 대신 기간을 제목으로 두고 그 안에서 하위 시각으로 한 번 더 묶는다.
 *
 * 여기서는 끌어서 순서를 바꿀 수 없다. 다른 기간 구획으로 카드를 옮기는 것이
 * 순서 변경인지 기간 변경인지 뜻이 갈리기 때문이다. 순서는 전체 탭에서, 기간은
 * 사건 수정 팝업에서 바꾼다.
 */
export function EventEraGroups({
  events,
  eras,
  onSelectEvent,
}: EventEraGroupsProps) {
  const groups = buildEraGroups(events, eras);

  return (
    <div className="h-full overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {groups.map((group) => (
          <section key={group.id}>
            <h2
              className="border-l-4 pl-3 text-base font-semibold text-zinc-900 dark:text-zinc-50"
              style={{ borderLeftColor: group.color ?? "transparent" }}
            >
              {group.name}
              <span className="ml-2 text-xs font-normal text-zinc-400">
                {group.eventCount}건
              </span>
            </h2>

            {group.times.length === 0 ? (
              <p className="mt-2 pl-3 text-sm text-zinc-400">
                아직 이 기간의 사건이 없습니다.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4 pl-3">
                {group.times.map((time) => (
                  <div key={time.displayTime}>
                    <h3 className="text-sm font-medium text-zinc-500">
                      {time.displayTime}
                    </h3>

                    <ul className="mt-1.5 flex flex-col gap-2">
                      {time.events.map((event) => (
                        <li key={event.id}>
                          <EventCard
                            event={event}
                            onSelect={() => onSelectEvent(event.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event,
  onSelect,
}: {
  event: EventItem;
  onSelect: () => void;
}) {
  const preview = event.description
    ? richTextToPlainText(event.description)
    : "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-lg border border-l-4 border-zinc-200 px-4 py-3 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
      style={{ borderLeftColor: event.color ?? DEFAULT_EVENT_COLOR }}
    >
      <p className="font-medium text-zinc-900 dark:text-zinc-50">
        {event.title}
      </p>

      {preview && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {preview}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {event.places.map((p) => (
          <EntityChip key={`place-${p.id}`} name={p.name} color={p.color} />
        ))}
        {event.characters.map((c) => (
          <EntityChip key={`character-${c.id}`} name={c.name} color={c.color} />
        ))}
      </div>
    </button>
  );
}
