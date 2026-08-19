"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { EventFormModal } from "@/components/timeline/EventFormModal";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Modal } from "@/components/ui/Modal";
import {
  RichTextEditor,
  isEmptyRichText,
  richTextToPlainText,
} from "@/components/ui/RichTextEditor";
import type { Character, EventItem } from "@/lib/api/types";
import { pickColor } from "@/lib/colors";
import {
  useCharacter,
  useCharacters,
  useCreateCharacter,
  useDeleteCharacter,
  useUpdateCharacter,
} from "@/lib/query/characters";
import { useEvents } from "@/lib/query/events";
import { usePlaces } from "@/lib/query/places";

export default function CharactersPage() {
  const params = useParams<{ worldId: string }>();
  const worldId = Number(params.worldId);

  const { data: characters, isLoading } = useCharacters(worldId);
  const { data: places } = usePlaces(worldId);
  // 사건 상세를 이 페이지에서 바로 열기 위해 전체 사건 목록이 필요하다.
  // 인물 상세 API가 주는 등장 사건에는 공간·인물 관계가 빠져 있어 모달에 쓸 수 없다.
  const { data: events } = useEvents(worldId);

  const [modalCharacter, setModalCharacter] = useState<Character | "new" | null>(
    null,
  );
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
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
            인물
          </h1>
          <button
            type="button"
            onClick={() => setModalCharacter("new")}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
          >
            + 새 인물
          </button>
        </div>

        {isLoading && <p className="text-sm text-zinc-500">불러오는 중...</p>}
        {characters?.length === 0 && (
          <p className="text-sm text-zinc-500">
            아직 등록된 인물이 없습니다.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {characters?.map((c) => (
            <li
              key={c.id}
              id={`character-${c.id}`}
              className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {c.name}
                  </p>
                  {c.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                      {richTextToPlainText(c.description)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expandedId === c.id ? null : c.id)
                  }
                  className="shrink-0 rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  등장 사건
                </button>
                <button
                  type="button"
                  onClick={() => setModalCharacter(c)}
                  className="shrink-0 rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  수정
                </button>
              </div>

              {expandedId === c.id && (
                <RelatedEvents
                  worldId={worldId}
                  characterId={c.id}
                  onSelectEvent={openEvent}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {modalCharacter && (
        <CharacterFormModal
          worldId={worldId}
          character={modalCharacter === "new" ? null : modalCharacter}
          existingCount={characters?.length ?? 0}
          onClose={() => setModalCharacter(null)}
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
  characterId,
  onSelectEvent,
}: {
  worldId: number;
  characterId: number;
  onSelectEvent: (eventId: number) => void;
}) {
  const { data, isLoading } = useCharacter(worldId, characterId);

  if (isLoading) {
    return <p className="mt-2 text-sm text-zinc-400">불러오는 중...</p>;
  }
  if (!data || data.events.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-400">
        이 인물이 등장하는 사건이 없습니다.
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

function CharacterFormModal({
  worldId,
  character,
  existingCount,
  onClose,
}: {
  worldId: number;
  character: Character | null;
  existingCount: number;
  onClose: () => void;
}) {
  const createCharacter = useCreateCharacter(worldId);
  const updateCharacter = useUpdateCharacter(worldId, character?.id ?? -1);
  const deleteCharacter = useDeleteCharacter(worldId);

  const [name, setName] = useState(character?.name ?? "");
  const [description, setDescription] = useState(
    character?.description ?? "",
  );
  const [color, setColor] = useState(
    character?.color ?? pickColor(existingCount),
  );
  const [error, setError] = useState<string | null>(null);

  const isPending = createCharacter.isPending || updateCharacter.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    try {
      if (character) {
        await updateCharacter.mutateAsync({
          name: name.trim(),
          description: isEmptyRichText(description) ? "" : description,
          color,
        });
      } else {
        await createCharacter.mutateAsync({
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
    if (!character) return;
    if (!confirm(`"${character.name}" 인물을 삭제할까요?`)) return;

    setError(null);
    try {
      await deleteCharacter.mutateAsync(character.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <Modal title={character ? "인물 수정" : "새 인물"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="인물 이름"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          required
        />
        <div>
          <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">설명</p>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="이 인물이 어떤 사람인지 적어보세요 (선택)"
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
          {character ? (
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
