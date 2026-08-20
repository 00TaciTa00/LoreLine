"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";

import { useUpdateWorld, useWorld } from "@/lib/query/worlds";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ worldId: string }>();
  const worldId = Number(params.worldId);
  const pathname = usePathname();

  const { data: world, isLoading } = useWorld(worldId);
  const updateWorld = useUpdateWorld(worldId);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const tabs = [
    { href: `/worlds/${worldId}`, label: "타임라인" },
    { href: `/worlds/${worldId}/eras`, label: "시간" },
    { href: `/worlds/${worldId}/places`, label: "공간" },
    { href: `/worlds/${worldId}/characters`, label: "인물" },
  ];

  function startEditing() {
    setNameDraft(world?.name ?? "");
    setEditing(true);
  }

  async function saveName() {
    if (nameDraft.trim()) {
      await updateWorld.mutateAsync({ name: nameDraft.trim() });
    }
    setEditing(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="shrink-0 text-sm text-zinc-500 hover:underline"
            >
              ← 세계관 목록
            </Link>
            {isLoading ? (
              <span className="text-sm text-zinc-400">불러오는 중...</span>
            ) : editing ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="rounded border border-zinc-300 px-2 py-1 text-lg font-semibold dark:border-zinc-700 dark:bg-zinc-950"
              />
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="truncate text-lg font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                title="클릭해서 이름 수정"
              >
                {world?.name}
              </button>
            )}
          </div>
          <ThemeToggle />
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
