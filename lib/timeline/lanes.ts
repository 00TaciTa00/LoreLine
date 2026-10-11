import type { Character, Place } from "@/lib/api/types";

/** 격자의 한 열 (공간 하나 또는 인물 하나) */
export type Lane = {
  /** 레인 식별자. 축이 섞이지 않도록 "place-1"처럼 축 이름을 붙인다. */
  id: string;
  /**
   * 원래 공간·인물의 id.
   *
   * 열 순서를 바꿀 때 서버로 보낼 id가 필요하다. `id`에서 접두사를 떼어
   * 쓰면 문자열 모양에 기대게 되므로 따로 들고 있는다.
   */
  entityId: number;
  label: string;
  color: string;
};

/**
 * 격자의 가로축을 이룰 열 목록. 사건이 하나도 없는 공간·인물도 포함해서,
 * 필터에서 끄고 켤 수 있고 빈 열도 눈에 보이게 한다.
 */
export function computeLanes(
  axis: "place" | "character",
  places: Place[],
  characters: Character[],
): Lane[] {
  if (axis === "place") {
    return places.map((p) => ({
      id: `place-${p.id}`,
      entityId: p.id,
      label: p.name,
      color: p.color,
    }));
  }
  return characters.map((c) => ({
    id: `character-${c.id}`,
    entityId: c.id,
    label: c.name,
    color: c.color,
  }));
}
