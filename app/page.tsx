"use client";

import Link from "next/link";
import { useState } from "react";

import { useCreateWorld, useDeleteWorld, useWorlds } from "@/lib/query/worlds";

export default function Home() {
  const { data: worlds, isLoading, isError } = useWorlds();
  const createWorld = useCreateWorld();
  const deleteWorld = useDeleteWorld();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createWorld.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setName("");
    setDescription("");
  }

  async function handleDelete(worldId: number, worldName: string) {
    if (!confirm(`"${worldName}" 세계관을 삭제할까요?`)) return;
    await deleteWorld.mutateAsync(worldId);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Loreline
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          세계관을 선택하거나 새로 만들어 서사 타임라인을 관리하세요.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          새 세계관 만들기
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="세계관 이름 (예: 아르텔 대륙기)"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명 (선택)"
          rows={2}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={createWorld.isPending}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {createWorld.isPending ? "생성 중..." : "세계관 생성"}
        </button>
        {createWorld.isError && (
          <p className="text-sm text-red-600">{createWorld.error.message}</p>
        )}
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          세계관 목록
        </h2>

        {isLoading && (
          <p className="text-sm text-zinc-500">불러오는 중...</p>
        )}
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
              <Link href={`/worlds/${w.id}`} className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {w.name}
                </p>
                {w.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                    {w.description}
                  </p>
                )}
              </Link>
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
    </div>
  );
}
