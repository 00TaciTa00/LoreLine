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
  /** 목록·격자 열 순서. BIGINT라 문자열로 온다. */
  sortKey: string;
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
  /** 목록·격자 열 순서. BIGINT라 문자열로 온다. */
  sortKey: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/**
 * 공간·인물 관계 없이 사건 자체만 담은 형태.
 *
 * 공간/인물 상세 API(`/places/:id`, `/characters/:id`)의 관련 사건 목록이
 * 이 모양으로 온다. 관계까지 필요하면 `useEvents`의 EventItem을 쓸 것.
 */
export type EventSummary = {
  id: number;
  worldId: number;
  timelineId: number;
  title: string;
  description: string | null;
  era: string | null;
  displayTime: string;
  sortKey: string;
  color: string | null;
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
  era: string | null;
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
  /** 상위 기간. 비우면 하위 시각만 표시된다. */
  era?: string | null;
  displayTime: string;
  description?: string | null;
  color?: string | null;
  placeIds: number[];
  characterIds: number[];
  placement?: EventPlacement;
};
