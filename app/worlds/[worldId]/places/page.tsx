"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ColorPicker } from "@/components/ui/ColorPicker";
import { Modal } from "@/components/ui/Modal";
import type { Place } from "@/lib/api/types";
import { pickColor } from "@/lib/colors";
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
  const [modalPlace, setModalPlace] = useState<Place | "new" | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {p.name}
                  </p>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                      {p.description}
                    </p>
                  )}
                </div>
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

              {expandedId === p.id && (
                <RelatedEvents worldId={worldId} placeId={p.id} />
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
    </div>
  );
}

function RelatedEvents({
  worldId,
  placeId,
}: {
  worldId: number;
  placeId: number;
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
          <Link
            href={`/worlds/${worldId}?eventId=${ev.id}`}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            {ev.displayTime} · {ev.title}
          </Link>
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

  const isPending = createPlace.isPending || updatePlace.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (place) {
      await updatePlace.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        color,
      });
    } else {
      await createPlace.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
    }
    onClose();
  }

  async function handleDelete() {
    if (!place) return;
    if (!confirm(`"${place.name}" 공간을 삭제할까요?`)) return;
    await deletePlace.mutateAsync(place.id);
    onClose();
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
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명 (선택)"
          rows={3}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div>
          <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            색상
          </p>
          <ColorPicker value={color} onChange={setColor} />
        </div>

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
