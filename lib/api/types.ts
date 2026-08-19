export type World = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Place = {
  id: number;
  worldId: number;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Character = {
  id: number;
  worldId: number;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// sort_key(BIGINT)는 API 응답에서 문자열로 직렬화된다.
export type EventItem = {
  id: number;
  worldId: number;
  timelineId: number;
  title: string;
  description: string | null;
  displayTime: string;
  sortKey: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  places: Place[];
  characters: Character[];
};

/**
 * 사건을 시퀀스 어디에 놓을지. "first"=맨 앞, "end"=맨 뒤,
 * 숫자=해당 사건 바로 뒤. 생략하면 생성 시 맨 뒤, 수정 시 순서 유지.
 */
export type EventPlacement = "first" | "end" | number;

export type EventInput = {
  title: string;
  displayTime: string;
  description?: string | null;
  color?: string | null;
  placeIds: number[];
  characterIds: number[];
  placement?: EventPlacement;
};
