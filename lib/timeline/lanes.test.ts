import { describe, expect, it } from "vitest";

import type { Character, EventItem, Place } from "@/lib/api/types";

import { computeLaneItems, computeLanes } from "./lanes";

function makePlace(id: number, name: string, color: string): Place {
  return {
    id,
    worldId: 1,
    name,
    description: null,
    color,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
  };
}

function makeCharacter(id: number, name: string, color: string): Character {
  return {
    id,
    worldId: 1,
    name,
    description: null,
    color,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
  };
}

function makeEvent(
  id: number,
  title: string,
  places: Place[],
  characters: Character[],
  color: string | null = null,
): EventItem {
  return {
    id,
    worldId: 1,
    timelineId: 1,
    title,
    description: null,
    displayTime: `시각 ${id}`,
    sortKey: String(id * 1000),
    color,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    places,
    characters,
  };
}

const palace = makePlace(1, "왕궁", "#ef4444");
const forest = makePlace(2, "숲", "#22c55e");
const eirin = makeCharacter(1, "에이린", "#3b82f6");
const kasl = makeCharacter(2, "카슬", "#a855f7");

describe("computeLanes", () => {
  it("전체 뷰는 단일 레인이다", () => {
    const lanes = computeLanes("all", [palace, forest], [eirin, kasl]);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].id).toBe("all");
  });

  it("공간별 뷰는 공간마다 레인을 만들고 공간 색을 쓴다", () => {
    const lanes = computeLanes("place", [palace, forest], [eirin]);
    expect(lanes.map((l) => l.id)).toEqual(["place-1", "place-2"]);
    expect(lanes.map((l) => l.label)).toEqual(["왕궁", "숲"]);
    expect(lanes[0].color).toBe("#ef4444");
  });

  it("인물별 뷰는 인물마다 레인을 만든다", () => {
    const lanes = computeLanes("character", [palace], [eirin, kasl]);
    expect(lanes.map((l) => l.id)).toEqual(["character-1", "character-2"]);
    expect(lanes.map((l) => l.label)).toEqual(["에이린", "카슬"]);
  });

  it("공간/인물이 없으면 레인도 없다", () => {
    expect(computeLanes("place", [], [])).toEqual([]);
    expect(computeLanes("character", [], [])).toEqual([]);
  });
});

describe("computeLaneItems", () => {
  it("전체 뷰에서는 사건 하나가 항목 하나로만 나온다", () => {
    const ev = makeEvent(1, "회담", [palace, forest], [eirin, kasl]);
    const items = computeLaneItems("all", [ev]);

    expect(items).toHaveLength(1);
    expect(items[0].laneId).toBe("all");
  });

  it("전체 뷰는 사건 색상을 쓰고, 없으면 기본색으로 대체한다", () => {
    const colored = makeEvent(1, "회담", [palace], [eirin], "#111111");
    expect(computeLaneItems("all", [colored])[0].color).toBe("#111111");

    const uncolored = makeEvent(2, "추격", [palace], [eirin], null);
    expect(computeLaneItems("all", [uncolored])[0].color).toBeTruthy();
  });

  it("공간별 뷰에서 여러 공간에 걸친 사건은 각 레인에 중복 배치된다", () => {
    // 동시간대 병렬 사건을 스윔레인으로 보여주는 핵심 동작이다.
    const ev = makeEvent(1, "회담", [palace, forest], [eirin]);
    const items = computeLaneItems("place", [ev]);

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.laneId).sort()).toEqual(["place-1", "place-2"]);
    // 각 항목은 자기 레인(공간)의 색을 따른다.
    expect(items.find((i) => i.laneId === "place-1")?.color).toBe("#ef4444");
    expect(items.find((i) => i.laneId === "place-2")?.color).toBe("#22c55e");
  });

  it("인물별 뷰에서도 등장 인물 수만큼 중복 배치된다", () => {
    const ev = makeEvent(1, "회담", [palace], [eirin, kasl]);
    const items = computeLaneItems("character", [ev]);

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.laneId).sort()).toEqual([
      "character-1",
      "character-2",
    ]);
  });

  it("공간별 뷰는 인물 수에 영향받지 않는다", () => {
    // 공간 1개 + 인물 2명이면 공간별 뷰에서는 항목이 1개여야 한다.
    const ev = makeEvent(1, "회담", [palace], [eirin, kasl]);
    expect(computeLaneItems("place", [ev])).toHaveLength(1);
  });

  it("소프트 삭제 등으로 관계가 비면 해당 뷰에서 사건이 사라진다", () => {
    // 공간이 모두 삭제된 사건은 공간별 뷰에 놓을 레인이 없다.
    const orphan = makeEvent(1, "고아 사건", [], [eirin]);
    expect(computeLaneItems("place", [orphan])).toHaveLength(0);
    // 전체 뷰에서는 여전히 보인다.
    expect(computeLaneItems("all", [orphan])).toHaveLength(1);
  });

  it("사건이 없으면 빈 배열을 반환한다", () => {
    expect(computeLaneItems("all", [])).toEqual([]);
    expect(computeLaneItems("place", [])).toEqual([]);
  });
});
