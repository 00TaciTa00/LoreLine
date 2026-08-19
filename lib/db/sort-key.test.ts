import { describe, expect, it } from "vitest";

import {
  INITIAL_GAP,
  MIN_GAP,
  appendSortKey,
  insertSortKey,
} from "./sort-key";

describe("appendSortKey", () => {
  it("빈 타임라인에서는 INITIAL_GAP으로 시작한다", () => {
    expect(appendSortKey(null)).toBe(INITIAL_GAP);
  });

  it("마지막 키에서 INITIAL_GAP만큼 떨어진 값을 반환한다", () => {
    expect(appendSortKey(1000n)).toBe(2000n);
    expect(appendSortKey(5500n)).toBe(6500n);
  });

  it("음수 키 뒤에도 이어 붙일 수 있다", () => {
    // 맨 앞 삽입이 반복되면 sort_key가 음수 영역으로 내려간다.
    expect(appendSortKey(-3000n)).toBe(-2000n);
  });
});

describe("insertSortKey", () => {
  it("양옆이 모두 없으면(첫 사건) INITIAL_GAP을 쓴다", () => {
    expect(insertSortKey(null, null)).toEqual({
      needsRebalance: false,
      sortKey: INITIAL_GAP,
    });
  });

  it("맨 앞에 삽입하면 첫 사건보다 INITIAL_GAP만큼 앞선다", () => {
    expect(insertSortKey(null, 1000n)).toEqual({
      needsRebalance: false,
      sortKey: 0n,
    });
    // 반복해서 맨 앞에 넣으면 음수로 내려가며, 이는 정상 동작이다.
    expect(insertSortKey(null, 0n)).toEqual({
      needsRebalance: false,
      sortKey: -1000n,
    });
  });

  it("맨 뒤에 삽입하면 마지막 사건보다 INITIAL_GAP만큼 뒤선다", () => {
    expect(insertSortKey(3000n, null)).toEqual({
      needsRebalance: false,
      sortKey: 4000n,
    });
  });

  it("중간 삽입은 양옆의 중간값을 쓴다", () => {
    expect(insertSortKey(1000n, 2000n)).toEqual({
      needsRebalance: false,
      sortKey: 1500n,
    });
  });

  it("중간값은 내림으로 계산한다 (bigint 나눗셈)", () => {
    // 1000과 2001의 중간은 1500.5 -> 1500
    expect(insertSortKey(1000n, 2001n)).toEqual({
      needsRebalance: false,
      sortKey: 1500n,
    });
  });

  it("간격이 MIN_GAP보다 크면 아직 재정렬이 필요 없다", () => {
    const gap = MIN_GAP + 1n; // 3
    const result = insertSortKey(1000n, 1000n + gap);
    expect(result.needsRebalance).toBe(false);
  });

  it("간격이 MIN_GAP 이하로 좁아지면 재정렬을 요구한다", () => {
    // 간격 2: 중간값을 내면 한쪽 끝과 충돌하므로 재정렬해야 한다.
    expect(insertSortKey(1000n, 1002n)).toEqual({ needsRebalance: true });
    // 간격 1: 사이에 넣을 정수가 없다.
    expect(insertSortKey(1000n, 1001n)).toEqual({ needsRebalance: true });
    // 간격 0(중복 키): 마찬가지로 재정렬 대상.
    expect(insertSortKey(1000n, 1000n)).toEqual({ needsRebalance: true });
  });

  it("재정렬이 필요 없다고 답한 경우 결과는 항상 양옆 사이의 값이다", () => {
    // 반복 중간 삽입에도 순서가 보존되는지 확인한다.
    let before = 0n;
    const after = 1_000_000n;

    for (let i = 0; i < 15; i++) {
      const result = insertSortKey(before, after);
      if (result.needsRebalance) break;

      expect(result.sortKey).toBeGreaterThan(before);
      expect(result.sortKey).toBeLessThan(after);
      before = result.sortKey;
    }
  });
});
