"use client";

import Link from "next/link";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import {
  RichTextEditor,
  isEmptyRichText,
  richTextToPlainText,
} from "@/components/ui/RichTextEditor";
import type { World } from "@/lib/api/types";
import {
  useCreateWorld,
  useDeleteWorld,
  useUpdateWorld,
  useWorlds,
} from "@/lib/query/worlds";

export default function Home() {
  const { data: worlds, isLoading, isError } = useWorlds();
  const deleteWorld = useDeleteWorld();

  // "new"면 생성 팝업, World면 그 세계관의 수정 팝업
  const [modalWorld, setModalWorld] = useState<World | "new" | null>(null);

  async function handleDelete(worldId: number, worldName: string) {
    if (!confirm(`"${worldName}" 세계관을 삭제할까요?`)) return;
    await deleteWorld.mutateAsync(worldId);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Loreline
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          세계관을 선택하거나 새로 만들어 서사 타임라인을 관리하세요.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            세계관 목록
          </h2>
          <button
            type="button"
            onClick={() => setModalWorld("new")}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
          >
            + 새 세계관
          </button>
        </div>

        {isLoading && <p className="text-sm text-zinc-500">불러오는 중...</p>}
        {isError && (
          <p className="text-sm text-red-600">목록을 불러오지 못했습니다.</p>
        )}
        {worlds?.length === 0 && (
          <p className="text-sm text-zinc-500">
            아직 세계관이 없습니다. 위에서 새로 만들어보세요.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {worlds?.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <Link href={`/worlds/${w.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {w.name}
                </p>
                {w.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                    {richTextToPlainText(w.description)}
                  </p>
                )}
              </Link>
              <button
                type="button"
                onClick={() => setModalWorld(w)}
                className="shrink-0 rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                수정
              </button>
              <button
                type="button"
                onClick={() => handleDelete(w.id, w.name)}
                className="shrink-0 rounded px-2 py-1 text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </div>

      {modalWorld && (
        <WorldFormModal
          world={modalWorld === "new" ? null : modalWorld}
          onClose={() => setModalWorld(null)}
        />
      )}
    </div>
  );
}

function WorldFormModal({
  world,
  onClose,
}: {
  world: World | null;
  onClose: () => void;
}) {
  const createWorld = useCreateWorld();
  const updateWorld = useUpdateWorld(world?.id ?? -1);

  const [name, setName] = useState(world?.name ?? "");
  const [description, setDescription] = useState(world?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const isPending = createWorld.isPending || updateWorld.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    try {
      if (world) {
        await updateWorld.mutateAsync({
          name: name.trim(),
          description: isEmptyRichText(description) ? "" : description,
        });
      } else {
        await createWorld.mutateAsync({
          name: name.trim(),
          description: isEmptyRichText(description) ? undefined : description,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  }

  return (
    <Modal title={world ? "세계관 수정" : "새 세계관"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="세계관 이름 (예: 아르텔 대륙기)"
          required
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />

        <div>
          <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">설명</p>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="이 세계관이 어떤 이야기인지 적어보세요 (선택)"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end">
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
