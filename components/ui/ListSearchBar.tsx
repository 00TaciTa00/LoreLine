"use client";

type ListSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** 걸러진 결과 수 (검색 중일 때만 쓴다) */
  resultCount: number;
  isSearching: boolean;
  /** 검색 중에는 순서를 바꿀 수 없다는 안내에 쓸 이름 */
  itemLabel: string;
};

export function ListSearchBar({
  value,
  onChange,
  placeholder,
  resultCount,
  isSearching,
  itemLabel,
}: ListSearchBarProps) {
  return (
    <div>
      <div className="relative">
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={`${itemLabel} 검색`}
          className="w-full rounded border border-zinc-300 px-3 py-2 pr-16 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {isSearching && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            {resultCount}건
          </span>
        )}
      </div>

      {/* 결과가 없으면 바꿀 순서 자체가 없으므로 안내하지 않는다 */}
      {isSearching && resultCount > 0 && (
        <p className="mt-1 text-xs text-zinc-500">
          검색 중에는 순서를 바꿀 수 없습니다. 검색어를 지우면 다시 끌 수 있습니다.
        </p>
      )}
    </div>
  );
}
