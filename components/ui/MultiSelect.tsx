"use client";

import { useId, useRef, useState } from "react";

export type MultiSelectOption = {
  id: number;
  name: string;
  color: string;
};

type MultiSelectProps = {
  label: string;
  options: MultiSelectOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** 아무것도 등록돼 있지 않을 때 보여줄 문구 */
  emptyHint: string;
  placeholder: string;
};

/**
 * 검색해서 고르고, 고른 것만 칩으로 보여주는 다중 선택.
 *
 * 예전에는 모든 후보를 칩으로 펼쳐놨는데, 공간·인물이 늘수록 사건 모달이
 * 계속 길어져 아래쪽 버튼이 밀려났다. 후보는 검색 결과에만 띄우고 화면에는
 * 선택한 것만 남겨 높이를 일정하게 유지한다.
 */
export function MultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  emptyHint,
  placeholder,
}: MultiSelectProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  /** 키보드로 훑는 위치 */
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = selectedIds
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is MultiSelectOption => o !== undefined);

  const matches = options.filter(
    (o) =>
      !selectedIds.includes(o.id) &&
      o.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function add(id: number) {
    onChange([...selectedIds, id]);
    setQuery("");
    setActiveIndex(0);
    // 연속으로 고를 수 있게 입력창에 포커스를 남긴다.
    inputRef.current?.focus();
  }

  function remove(id: number) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      // 폼 제출을 가로채고 후보를 고른다.
      e.preventDefault();
      const pick = matches[activeIndex];
      if (pick) add(pick.id);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    // 빈 입력에서 지우기를 누르면 마지막 선택을 뺀다.
    if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1].id);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </p>

      {options.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyHint}</p>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />

          {open && (
            <>
              {/* 바깥을 누르면 닫힌다 */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <ul
                id={listId}
                role="listbox"
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                {matches.length === 0 ? (
                  <li className="px-2 py-1.5 text-sm text-zinc-400">
                    {query.trim()
                      ? "일치하는 항목이 없습니다."
                      : "모두 선택했습니다."}
                  </li>
                ) : (
                  matches.map((option, index) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => add(option.id)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                          index === activeIndex
                            ? "bg-zinc-100 dark:bg-zinc-800"
                            : ""
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                        <span className="truncate">{option.name}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-2.5 py-1 text-sm dark:border-zinc-700"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: option.color }}
              />
              {option.name}
              <button
                type="button"
                onClick={() => remove(option.id)}
                aria-label={`${option.name} 제거`}
                className="rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
