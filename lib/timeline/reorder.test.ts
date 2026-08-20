import { describe, expect, it } from "vitest";

import type { EventItem } from "@/lib/api/types";

import { placementForDrop, reorderById } from "./reorder";

function ev(id: number, title: string): EventItem {
  return {
    id,
    worldId: 1,
    timelineId: 1,
    title,
    description: null,
    era: null,
    displayTime: `t${id}`,
    sortKey: String(id * 1000),
    color: null,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    places: [],
    characters: [],
  };
}

/** [A, B, C, D] */
const list = [ev(1, "A"), ev(2, "B"), ev(3, "C"), ev(4, "D")];
const titles = (events: EventItem[]) => events.map((e) => e.title);

describe("placementForDrop", () => {
  it("맨 위로 옮기면 first", () => {
    expect(placementForDrop(list, 3, 0)).toBe("first");
  });

  it("중간으로 옮기면 바로 앞 사건의 id", () => {
    // C를 A 다음(제외 목록 [A,B,D]의 1번 자리)으로
    expect(placementForDrop(list, 3, 1)).toBe(1);
  });

  it("맨 아래로 옮기면 마지막 사건의 id", () => {
    // A를 끝으로: 제외 목록 [B,C,D]의 3번 자리 -> D 뒤
    expect(placementForDrop(list, 1, 3)).toBe(4);
  });

  it("제자리에 놓으면 null (요청하지 않는다)", () => {
    // B(인덱스 1)를 제외 목록의 1번 자리에 = 원래 자리
    expect(placementForDrop(list, 2, 1)).toBeNull();
  });

  it("첫 항목을 맨 앞에 놓아도 null", () => {
    expect(placementForDrop(list, 1, 0)).toBeNull();
  });

  it("범위를 벗어난 위치는 양끝으로 보정한다", () => {
    expect(placementForDrop(list, 1, 999)).toBe(4);
    expect(placementForDrop(list, 4, -5)).toBe("first");
  });

  it("목록에 없는 사건이면 null", () => {
    expect(placementForDrop(list, 999, 0)).toBeNull();
  });

  it("항목이 하나뿐이면 옮길 곳이 없다", () => {
    const one = [ev(1, "A")];
    expect(placementForDrop(one, 1, 0)).toBeNull();
    expect(placementForDrop(one, 1, 1)).toBeNull();
  });
});

describe("reorderById", () => {
  it("first는 맨 앞으로 보낸다", () => {
    expect(titles(reorderById(list, 3, "first"))).toEqual(["C", "A", "B", "D"]);
  });

  it("end는 맨 뒤로 보낸다", () => {
    expect(titles(reorderById(list, 1, "end"))).toEqual(["B", "C", "D", "A"]);
  });

  it("id를 주면 그 사건 바로 뒤에 놓는다", () => {
    expect(titles(reorderById(list, 4, 1))).toEqual(["A", "D", "B", "C"]);
  });

  it("뒤에서 앞으로 옮겨도 순서가 맞다", () => {
    expect(titles(reorderById(list, 1, 3))).toEqual(["B", "C", "A", "D"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const before = titles(list);
    reorderById(list, 1, "end");
    expect(titles(list)).toEqual(before);
  });

  it("없는 사건이나 없는 기준점이면 그대로 둔다", () => {
    expect(titles(reorderById(list, 999, "first"))).toEqual(titles(list));
    expect(titles(reorderById(list, 1, 999))).toEqual(titles(list));
  });

  it("placementForDrop 결과를 그대로 넣으면 의도한 자리로 간다", () => {
    // C를 맨 앞으로 끌었을 때
    const placement = placementForDrop(list, 3, 0)!;
    expect(titles(reorderById(list, 3, placement))).toEqual([
      "C",
      "A",
      "B",
      "D",
    ]);

    // A를 맨 뒤로 끌었을 때
    const toEnd = placementForDrop(list, 1, 3)!;
    expect(titles(reorderById(list, 1, toEnd))).toEqual(["B", "C", "D", "A"]);
  });
});
