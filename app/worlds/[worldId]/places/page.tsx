"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { EventFormModal } from "@/components/timeline/EventFormModal";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Modal } from "@/components/ui/Modal";
import {
  RichTextEditor,
  RichTextView,
  isEmptyRichText,
  richTextToPlainText,
} from "@/components/ui/RichTextEditor";
import type { EventItem, Place } from "@/lib/api/types";
import { pickColor } from "@/lib/colors";
import { useCharacters } from "@/lib/query/characters";
import { useEvents } from "@/lib/query/events";
import {
  useCreatePlace,
  useDeletePlace,
  usePlace,
  usePlaces,
  useUpdatePlace,
} from "@/lib/query/places";

export default function PlacesPage() {
  const params = useParams<{ worldId: string }>();
  const worldId = Number(params.worldId);

  const { data: places, isLoading } = usePlaces(worldId);
  const { data: characters } = useCharacters(worldId);
  // 사건 상세를 이 페이지에서 바로 열기 위해 전체 사건 목록이 필요하다.
  // 공간 상세 API가 주는 관련 사건에는 공간·인물 관계가 빠져 있어 모달에 쓸 수 없다.
  const { data: events } = useEvents(worldId);

  const [modalPlace, setModalPlace] = useState<Place | "new" | null>(null);
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
  // 설명 펼침과 관련 사건 펼침은 서로 독립적으로 동작한다.
  const [descriptionId, setDescriptionId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function openEvent(eventId: number) {
    const found = events?.find((e) => e.id === eventId);
    if (found) setModalEvent(found);
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            공간
          </h1>
          <button
            type="button"
            onClick={() => setModalPlace("new")}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
          >
            + 새 공간
          </button>
        </div>

        {isLoading && <p className="text-sm text-zinc-500">불러오는 중...</p>}
        {places?.length === 0 && (
          <p className="text-sm text-zinc-500">
            아직 등록된 공간이 없습니다.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {places?.map((p) => (
            <li
              key={p.id}
              id={`place-${p.id}`}
              className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color }}
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
                  관련 사건
                </button>
                <button
                  type="button"
                  onClick={() => setModalPlace(p)}
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
                  placeId={p.id}
                  onSelectEvent={openEvent}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {modalPlace && (
        <PlaceFormModal
          worldId={worldId}
          place={modalPlace === "new" ? null : modalPlace}
          existingCount={places?.length ?? 0}
          onClose={() => setModalPlace(null)}
        />
      )}

      {modalEvent && (
        <EventFormModal
          worldId={worldId}
          event={modalEvent}
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
  placeId,
  onSelectEvent,
}: {
  worldId: number;
  placeId: number;
  onSelectEvent: (eventId: number) => void;
}) {
  const { data, isLoading } = usePlace(worldId, placeId);

  if (isLoading) {
    return <p className="mt-2 text-sm text-zinc-400">불러오는 중...</p>;
  }
  if (!data || data.events.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-400">
        이 공간과 연결된 사건이 없습니다.
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
            {ev.displayTime} · {ev.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PlaceFormModal({
  worldId,
  place,
  existingCount,
  onClose,
}: {
  worldId: number;
  place: Place | null;
  existingCount: number;
  onClose: () => void;
}) {
  const createPlace = useCreatePlace(worldId);
  const updatePlace = useUpdatePlace(worldId, place?.id ?? -1);
  const deletePlace = useDeletePlace(worldId);

  const [name, setName] = useState(place?.name ?? "");
  const [description, setDescription] = useState(place?.description ?? "");
  const [color, setColor] = useState(place?.color ?? pickColor(existingCount));
  const [error, setError] = useState<string | null>(null);

  const isPending = createPlace.isPending || updatePlace.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    try {
      if (place) {
        await updatePlace.mutateAsync({
          name: name.trim(),
          description: isEmptyRichText(description) ? "" : description,
          color,
        });
      } else {
        await createPlace.mutateAsync({
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
    if (!place) return;
    if (!confirm(`"${place.name}" 공간을 삭제할까요?`)) return;

    setError(null);
    try {
      await deletePlace.mutateAsync(place.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <Modal title={place ? "공간 수정" : "새 공간"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="공간 이름"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          required
        />
        <div>
          <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">설명</p>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="이 공간이 어떤 곳인지 적어보세요 (선택)"
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            색상
          </p>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex items-center justify-between">
          {place ? (
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
