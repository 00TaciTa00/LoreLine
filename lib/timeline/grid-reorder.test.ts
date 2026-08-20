import { describe, expect, it } from "vitest";

import type { EventItem } from "@/lib/api/types";

import { buildGrid } from "./grid";
import { placementForRowDrop } from "./grid-reorder";

function ev(
  id: number,
  title: string,
  displayTime: string,
  placeIds: number[],
): EventItem {
  return {
    id,
    worldId: 1,
    timelineId: 1,
    title,
    description: null,
    era: null,
    displayTime,
    sortKey: String(id * 1000),
    color: null,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    places: placeIds.map((pid) => ({
      id: pid,
      worldId: 1,
      name: `공간${pid}`,
      description: null,
      color: "#000",
      sortKey: "1000",
      createdAt: "",
      updatedAt: "",
      deletedAt: null,
    })),
    characters: [],
  };
}

const VISIBLE = new Set(["place-1", "place-2"]);

/** A(1행) B(2행) C(3행) — 각각 다른 시각 */
const simple = [
  ev(1, "A", "1년", [1]),
  ev(2, "B", "2년", [2]),
  ev(3, "C", "3년", [1]),
];

describe("placementForRowDrop", () => {
  it("맨 위 틈으로 옮기면 first", () => {
    const rows = buildGrid(simple, "place", VISIBLE);
    expect(placementForRowDrop(rows, 3, 0)).toBe("first");
  });

  it("중간 틈으로 옮기면 그 앞 행의 마지막 사건 뒤로 간다", () => {
    const rows = buildGrid(simple, "place", VISIBLE);
    // C를 A와 B 사이(틈 1)로
    expect(placementForRowDrop(rows, 3, 1)).toBe(1);
  });

  it("맨 아래 틈으로 옮기면 마지막 사건 뒤로 간다", () => {
    const rows = buildGrid(simple, "place", VISIBLE);
    // A를 맨 뒤(틈 3)로
    expect(placementForRowDrop(rows, 1, 3)).toBe(3);
  });

  it("제자리에 놓으면 null", () => {
    const rows = buildGrid(simple, "place", VISIBLE);
    // B(2행)를 자기 앞 틈(1)에 놓기 = 제자리
    expect(placementForRowDrop(rows, 2, 1)).toBeNull();
    // B를 자기 뒤 틈(2)에 놓아도 제자리
    expect(placementForRowDrop(rows, 2, 2)).toBeNull();
  });

  it("격자에 없는 사건이면 null", () => {
    const rows = buildGrid(simple, "place", VISIBLE);
    expect(placementForRowDrop(rows, 999, 0)).toBeNull();
  });

  it("범위를 벗어난 틈은 양끝으로 보정한다", () => {
    const rows = buildGrid(simple, "place", VISIBLE);
    expect(placementForRowDrop(rows, 1, 999)).toBe(3);
    expect(placementForRowDrop(rows, 3, -5)).toBe("first");
  });

  describe("한 행에 사건이 여럿일 때", () => {
    // A,B는 같은 시각이라 한 행에 묶인다. C는 다음 행.
    const merged = [
      ev(1, "A", "1년", [1]),
      ev(2, "B", "1년", [2]),
      ev(3, "C", "2년", [1]),
    ];

    it("묶인 행 전체를 건너뛰어 옮긴다", () => {
      const rows = buildGrid(merged, "place", VISIBLE);
      expect(rows).toHaveLength(2);
      // A(첫 행)를 맨 뒤(틈 2)로 -> 마지막 사건 C 뒤
      expect(placementForRowDrop(rows, 1, 2)).toBe(3);
    });

    it("이미 그 행 바로 뒤에 있으면 제자리다", () => {
      const rows = buildGrid(merged, "place", VISIBLE);
      // C는 이미 첫 행(A,B) 다음이므로 틈 1은 제자리
      expect(placementForRowDrop(rows, 3, 1)).toBeNull();
    });

    it("묶인 행의 사건을 맨 앞으로 보낼 수 있다", () => {
      const rows = buildGrid(merged, "place", VISIBLE);
      expect(placementForRowDrop(rows, 2, 0)).toBe("first");
    });

    it("묶인 행 안의 사건을 그 행 뒤로 놓으면 제자리다", () => {
      const rows = buildGrid(merged, "place", VISIBLE);
      // B는 첫 행의 마지막이므로 틈 1은 제자리
      expect(placementForRowDrop(rows, 2, 1)).toBeNull();
    });
  });

  it("숨긴 열의 사건은 계산에 들어가지 않는다", () => {
    // 공간2만 보이게 하면 B만 남는다.
    const rows = buildGrid(simple, "place", new Set(["place-2"]));
    expect(rows).toHaveLength(1);
    // 보이는 사건이 하나뿐이라 옮길 곳이 없다.
    expect(placementForRowDrop(rows, 2, 0)).toBeNull();
    expect(placementForRowDrop(rows, 2, 1)).toBeNull();
  });
});
