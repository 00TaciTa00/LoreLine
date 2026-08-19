"use client";

import Link from "next/link";
import { useState } from "react";

import { ColorPicker } from "@/components/ui/ColorPicker";
import { Modal } from "@/components/ui/Modal";
import { RichTextEditor, isEmptyRichText } from "@/components/ui/RichTextEditor";
import type {
  Character,
  EventItem,
  EventPlacement,
  Place,
} from "@/lib/api/types";
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/lib/query/events";

type EventFormModalProps = {
  worldId: number;
  event: EventItem | null;
  places: Place[];
  characters: Character[];
  /** 작중 시간순으로 정렬된 같은 세계관의 사건들 (순서 지정 선택지로 사용) */
  events: EventItem[];
  onClose: () => void;
};

/** 순서를 바꾸지 않음을 나타내는 select 값 (수정 시 기본값) */
const KEEP_ORDER = "keep";

export function EventFormModal({
  worldId,
  event,
  places,
  characters,
  events,
  onClose,
}: EventFormModalProps) {
  const createEvent = useCreateEvent(worldId);
  const updateEvent = useUpdateEvent(worldId, event?.id ?? -1);
  const deleteEvent = useDeleteEvent(worldId);

  const [title, setTitle] = useState(event?.title ?? "");
  const [displayTime, setDisplayTime] = useState(event?.displayTime ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [color, setColor] = useState(event?.color ?? "#64748b");
  const [placeIds, setPlaceIds] = useState<number[]>(
    event?.places.map((p) => p.id) ?? [],
  );
  const [characterIds, setCharacterIds] = useState<number[]>(
    event?.characters.map((c) => c.id) ?? [],
  );
  // 수정 시에는 기본이 "순서 유지", 생성 시에는 "맨 뒤".
  const [placement, setPlacement] = useState<string>(
    event ? KEEP_ORDER : "end",
  );
  const [error, setError] = useState<string | null>(null);

  const isPending = createEvent.isPending || updateEvent.isPending;
  const selectedPlaces = places.filter((p) => placeIds.includes(p.id));
  const selectedCharacters = characters.filter((c) => characterIds.includes(c.id));
  // 자기 자신 뒤로 보내는 선택지는 의미가 없으므로 제외한다.
  const otherEvents = events.filter((e) => e.id !== event?.id);

  function toPlacement(): EventPlacement | undefined {
    if (placement === KEEP_ORDER) return undefined;
    if (placement === "first" || placement === "end") return placement;
    return Number(placement);
  }

  function toggle(list: number[], id: number, setter: (v: number[]) => void) {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !displayTime.trim()) return;
    if (placeIds.length === 0) {
      setError("공간을 최소 1개 이상 선택하세요.");
      return;
    }
    if (characterIds.length === 0) {
      setError("인물을 최소 1개 이상 선택하세요.");
      return;
    }

    try {
      if (event) {
        await updateEvent.mutateAsync({
          title: title.trim(),
          displayTime: displayTime.trim(),
          description: isEmptyRichText(description) ? null : description,
          color,
          placeIds,
          characterIds,
          placement: toPlacement(),
        });
      } else {
        await createEvent.mutateAsync({
          title: title.trim(),
          displayTime: displayTime.trim(),
          description: isEmptyRichText(description) ? undefined : description,
          color,
          placeIds,
          characterIds,
          placement: toPlacement(),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm(`"${event.title}" 사건을 삭제할까요?`)) return;
    await deleteEvent.mutateAsync(event.id);
    onClose();
  }

  return (
    <Modal title={event ? "사건 수정" : "새 사건"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="사건 제목"
          required
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <input
          value={displayTime}
          onChange={(e) => setDisplayTime(e.target.value)}
          placeholder="작중 시각 (예: 3년째 겨울, 즉위 12년)"
          required
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div>
          <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">내용</p>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="이 사건에서 무슨 일이 있었는지 적어보세요 (선택)"
          />
        </div>

        <div>
          <label
            htmlFor="event-placement"
            className="mb-1.5 block text-sm text-zinc-600 dark:text-zinc-400"
          >
            작중 순서
          </label>
          <select
            id="event-placement"
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {event && <option value={KEEP_ORDER}>순서 유지</option>}
            <option value="first">맨 앞으로</option>
            <option value="end">맨 뒤로</option>
            {otherEvents.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.displayTime} · {e.title} 다음으로
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            작중 시각 라벨과 별개로, 연표에 놓이는 순서를 정합니다.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            색상 (전체 뷰에서 이 사건을 나타냄)
          </p>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            공간 (필수, 다중 선택)
          </legend>
          <div className="flex flex-wrap gap-2">
            {places.length === 0 && (
              <p className="text-sm text-zinc-400">
                등록된 공간이 없습니다. 먼저 공간을 만드세요.
              </p>
            )}
            {places.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm ${
                  placeIds.includes(p.id)
                    ? "border-zinc-900 dark:border-zinc-50"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={placeIds.includes(p.id)}
                  onChange={() => toggle(placeIds, p.id, setPlaceIds)}
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            인물 (필수, 다중 선택)
          </legend>
          <div className="flex flex-wrap gap-2">
            {characters.length === 0 && (
              <p className="text-sm text-zinc-400">
                등록된 인물이 없습니다. 먼저 인물을 만드세요.
              </p>
            )}
            {characters.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm ${
                  characterIds.includes(c.id)
                    ? "border-zinc-900 dark:border-zinc-50"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={characterIds.includes(c.id)}
                  onChange={() => toggle(characterIds, c.id, setCharacterIds)}
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        {(selectedPlaces.length > 0 || selectedCharacters.length > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800">
            {selectedPlaces.map((p) => (
              <Link
                key={p.id}
                href={`/worlds/${worldId}/places#place-${p.id}`}
                className="hover:underline"
              >
                📍 {p.name} 바로가기
              </Link>
            ))}
            {selectedCharacters.map((c) => (
              <Link
                key={c.id}
                href={`/worlds/${worldId}/characters#character-${c.id}`}
                className="hover:underline"
              >
                👤 {c.name} 바로가기
              </Link>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex items-center justify-between">
          {event ? (
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
