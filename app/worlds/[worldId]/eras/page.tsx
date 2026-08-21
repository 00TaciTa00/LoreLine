"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { EventFormModal } from "@/components/timeline/EventFormModal";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Modal } from "@/components/ui/Modal";
import {
  RichTextEditor,
  RichTextView,
  isEmptyRichText,
  richTextToPlainText,
} from "@/components/ui/RichTextEditor";
import type { EventItem, Era } from "@/lib/api/types";
import { pickColor } from "@/lib/colors";
import { useCharacters } from "@/lib/query/characters";
import { usePlaces } from "@/lib/query/places";
import { useEvents } from "@/lib/query/events";
import {
  useCreateEra,
  useDeleteEra,
  useEra,
  useEras,
  useReorderEra,
  useUpdateEra,
} from "@/lib/query/eras";
import { useDragReorder } from "@/lib/hooks/useDragReorder";
import { placementForDrop } from "@/lib/timeline/reorder";
import { formatDisplayTime } from "@/lib/timeline/display-time";

export default function ErasPage() {
  const params = useParams<{ worldId: string }>();
  const worldId = Number(params.worldId);

  const { data: eras, isLoading } = useEras(worldId);
  const reorderEra = useReorderEra(worldId);
  const { data: characters } = useCharacters(worldId);
  const { data: places } = usePlaces(worldId);
  // 사건 상세를 이 페이지에서 바로 열기 위해 전체 사건 목록이 필요하다.
  // 시간 상세 API가 주는 이 기간의 사건에는 시간·인물 관계가 빠져 있어 모달에 쓸 수 없다.
  const { data: events } = useEvents(worldId);

  const [modalEra, setModalEra] = useState<Era | "new" | null>(null);
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
  // 설명 펼침과 이 기간의 사건 펼침은 서로 독립적으로 동작한다.
  const [descriptionId, setDescriptionId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function openEvent(eventId: number) {
    const found = events?.find((e) => e.id === eventId);
    if (found) setModalEvent(found);
  }

  const drag = useDragReorder(
    (eras ?? []).map((p) => p.id),
    (eraId, toIndex) => {
      const placement = placementForDrop(eras ?? [], eraId, toIndex);
      if (placement === null) return;
      reorderEra.mutate({ eraId, placement });
    },
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            시간
          </h1>
          <button
            type="button"
            onClick={() => setModalEra("new")}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
          >
            + 새 기간
          </button>
        </div>

        {isLoading && <p className="text-sm text-zinc-500">불러오는 중...</p>}
        {eras?.length === 0 && (
          <p className="text-sm text-zinc-500">
            아직 등록된 기간이 없습니다.
          </p>
        )}

        <ul className="flex flex-col gap-2" {...drag.containerProps}>
          {eras?.map((p, index) => (
            <li
              key={p.id}
              id={`era-${p.id}`}
              {...drag.itemProps(p.id, index)}
              className={drag.draggingId === p.id ? "opacity-40" : ""}
            >
              {drag.showLineAt(index) && (
                <div className="mb-1 h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
              )}

              <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 cursor-grab rounded-full active:cursor-grabbing"
                  style={{ backgroundColor: p.color }}
                  title="끌어서 순서 변경"
                />
                {/* 항목을 누르면 설명을 펼치고 접는다 */}
                <button
                  type="button"
                  onClick={() =>
                    setDescriptionId(descriptionId === p.id ? null : p.id)
                  }
                  aria-expanded={descriptionId === p.id}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {p.name}
                  </p>
                  {p.description && descriptionId !== p.id && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                      {richTextToPlainText(p.description)}
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expandedId === p.id ? null : p.id)
                  }
                  className="shrink-0 rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  이 기간의 사건
                </button>
                <button
                  type="button"
                  onClick={() => setModalEra(p)}
                  className="shrink-0 rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  수정
                </button>
              </div>

              {descriptionId === p.id && (
                <div className="mt-2 border-t border-zinc-100 pt-2 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                  {p.description && !isEmptyRichText(p.description) ? (
                    <RichTextView html={p.description} />
                  ) : (
                    <p className="text-zinc-400">설명이 없습니다.</p>
                  )}
                </div>
              )}

              {expandedId === p.id && (
                <RelatedEvents
                  worldId={worldId}
                  eraId={p.id}
                  onSelectEvent={openEvent}
                  allEvents={events ?? []}
                />
              )}
              </div>

              {index === (eras?.length ?? 0) - 1 &&
                drag.showLineAt(eras?.length ?? 0) && (
                  <div className="mt-1 h-0.5 rounded bg-zinc-900 dark:bg-zinc-50" />
                )}
            </li>
          ))}
        </ul>
      </div>

      {modalEra && (
        <EraFormModal
          worldId={worldId}
          era={modalEra === "new" ? null : modalEra}
          existingCount={eras?.length ?? 0}
          onClose={() => setModalEra(null)}
        />
      )}

      {modalEvent && (
        <EventFormModal
          worldId={worldId}
          event={modalEvent}
          eras={eras ?? []}
          places={places ?? []}
          characters={characters ?? []}
          events={events ?? []}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  );
}

function RelatedEvents({
  worldId,
  eraId,
  onSelectEvent,
  allEvents,
}: {
  worldId: number;
  eraId: number;
  onSelectEvent: (eventId: number) => void;
  /** 상위 기간 이름을 얻기 위한 전체 사건 목록 */
  allEvents: EventItem[];
}) {
  const { data, isLoading } = useEra(worldId, eraId);

  if (isLoading) {
    return <p className="mt-2 text-sm text-zinc-400">불러오는 중...</p>;
  }
  if (!data || data.events.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-400">
        이 기간에 속한 사건이 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-col gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
      {data.events.map((ev) => (
        <li key={ev.id}>
          <button
            type="button"
            onClick={() => onSelectEvent(ev.id)}
            className="text-left text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            {formatDisplayTime(allEvents.find((e) => e.id === ev.id) ?? { era: null, displayTime: ev.displayTime })} · {ev.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

function EraFormModal({
  worldId,
  era,
  existingCount,
  onClose,
}: {
  worldId: number;
  era: Era | null;
  existingCount: number;
  onClose: () => void;
}) {
  const createEra = useCreateEra(worldId);
  const updateEra = useUpdateEra(worldId, era?.id ?? -1);
  const deleteEra = useDeleteEra(worldId);

  const [name, setName] = useState(era?.name ?? "");
  const [description, setDescription] = useState(era?.description ?? "");
  const [color, setColor] = useState(era?.color ?? pickColor(existingCount));
  const [error, setError] = useState<string | null>(null);

  const isPending = createEra.isPending || updateEra.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    try {
      if (era) {
        await updateEra.mutateAsync({
          name: name.trim(),
          description: isEmptyRichText(description) ? "" : description,
          color,
        });
      } else {
        await createEra.mutateAsync({
          name: name.trim(),
          description: isEmptyRichText(description) ? undefined : description,
          color,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  }

  async function handleDelete() {
    if (!era) return;
    if (!confirm(`"${era.name}" 시간을 삭제할까요?`)) return;

    setError(null);
    try {
      await deleteEra.mutateAsync(era.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <Modal title={era ? "기간 수정" : "새 기간"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <FieldLabel htmlFor="era-name" required>
            기간 이름
          </FieldLabel>
          <input
            id="era-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="기간 이름"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <FieldLabel>설명</FieldLabel>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="이 기간이 어떤 시대인지 적어보세요 (선택)"
          />
        </div>
        <div>
          <FieldLabel>색상</FieldLabel>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex items-center justify-between">
          {era ? (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
