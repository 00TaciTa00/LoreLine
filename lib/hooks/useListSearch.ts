"use client";

import { useState } from "react";

type Named = { name: string };

export type ListSearch<T> = {
  query: string;
  setQuery: (value: string) => void;
  /** 검색어에 걸리는 항목만. 검색어가 없으면 원본 그대로. */
  filtered: T[];
  /** 지금 목록이 걸러져 있는지 */
  isSearching: boolean;
};

/**
 * 이름으로 목록을 걸러낸다.
 *
 * 설명까지 뒤지지 않는 이유: 이름만 보면 왜 걸렸는지 화면에서 바로 보이는데,
 * 설명이 걸리면 목록에 안 보이는 글자 때문에 남은 항목이 이해되지 않는다.
 */
export function useListSearch<T extends Named>(items: T[]): ListSearch<T> {
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();
  const isSearching = trimmed !== "";

  return {
    query,
    setQuery,
    isSearching,
    filtered: isSearching
      ? items.filter((item) => item.name.toLowerCase().includes(trimmed))
      : items,
  };
}
