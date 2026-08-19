/**
 * Loreline DB 스키마 (Drizzle ORM / PostgreSQL)
 *
 * 계층 구조: World -> Timeline -> Event -> (Place / Character, 다대다)
 *
 * 설계 원칙:
 * - 가상 시간축이므로 DATE/TIMESTAMP 대신 Event.display_time(라벨 문자열) +
 *   Event.sort_key(BIGINT, 정렬 전용)로 분리한다.
 * - 모든 핵심 테이블은 world_id FK로 세계관 단위 데이터 격리를 강제한다.
 * - Event는 (world_id, sort_key) 복합 인덱스로 세계관 내 시간순 조회를 최적화하고,
 *   실제 렌더링 단위인 (timeline_id, sort_key)에도 별도 인덱스를 둔다.
 * - Event<->Character, Event<->Place는 다대다 조인 테이블로 표현하며
 *   ON DELETE CASCADE(조인 행만 삭제, 본체 엔티티는 보존) + 복합 유니크 제약 +
 *   각 FK 컬럼 인덱스를 갖는다.
 * - 핵심 엔티티(World/Timeline/Event/Place/Character)는 하드 삭제 대신
 *   deleted_at 소프트 삭제를 사용한다.
 */

import {
  bigint,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// World: 최상위 세계관. 다른 모든 핵심 테이블은 world_id로 이 테이블을 참조한다.
// ---------------------------------------------------------------------------
export const world = pgTable("world", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Timeline: 하나의 세계관 안에 여러 개의 시간축(연표)을 둘 수 있다.
// (예: "메인 스토리라인", "OO 왕국 흥망사" 등)
// ---------------------------------------------------------------------------
export const timeline = pgTable(
  "timeline",
  {
    id: serial("id").primaryKey(),
    worldId: bigint("world_id", { mode: "number" })
      .notNull()
      .references(() => world.id),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("timeline_world_id_idx").on(t.worldId)],
);

// ---------------------------------------------------------------------------
// Place: 세계관 내 공간(장소). Event와 다대다 관계.
// ---------------------------------------------------------------------------
export const place = pgTable(
  "place",
  {
    id: serial("id").primaryKey(),
    worldId: bigint("world_id", { mode: "number" })
      .notNull()
      .references(() => world.id),
    name: text("name").notNull(),
    description: text("description"),
    // 스윔레인/타임라인에서 이 공간을 나타내는 색상 (hex, 예: "#3b82f6")
    color: text("color").notNull().default("#64748b"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("place_world_id_idx").on(t.worldId)],
);

// ---------------------------------------------------------------------------
// Character: 세계관 내 인물. Event와 다대다 관계.
// ---------------------------------------------------------------------------
export const character = pgTable(
  "character",
  {
    id: serial("id").primaryKey(),
    worldId: bigint("world_id", { mode: "number" })
      .notNull()
      .references(() => world.id),
    name: text("name").notNull(),
    description: text("description"),
    // 스윔레인/타임라인에서 이 인물을 나타내는 색상 (hex, 예: "#3b82f6")
    color: text("color").notNull().default("#64748b"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("character_world_id_idx").on(t.worldId)],
);

// ---------------------------------------------------------------------------
// Event: 작중 사건. 가상 시간축 정렬은 sort_key로만 수행하고,
// display_time은 "3년째 겨울", "즉위 12년" 같은 자유 형식 라벨을 저장한다.
//
// sort_key 삽입 전략(애플리케이션 레이어에서 구현):
// - 초기 삽입: 1000 단위 간격으로 채번 (1000, 2000, 3000, ...)
// - 중간 삽입: 양옆 sort_key의 평균값 사용
// - 간격이 임계치(예: 2) 이하로 좁아지면 해당 구간만 부분 재정렬을 트랜잭션으로 수행
// ---------------------------------------------------------------------------
export const event = pgTable(
  "event",
  {
    id: serial("id").primaryKey(),
    worldId: bigint("world_id", { mode: "number" })
      .notNull()
      .references(() => world.id),
    timelineId: bigint("timeline_id", { mode: "number" })
      .notNull()
      .references(() => timeline.id),
    title: text("title").notNull(),
    description: text("description"),
    displayTime: text("display_time").notNull(),
    sortKey: bigint("sort_key", { mode: "bigint" }).notNull(),
    // "전체" 뷰에서 사건 자체를 구분하는 색상 (hex). 미지정 시 UI에서 기본값 사용.
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // 세계관 단위 시간순 조회 (스펙 명시 요구사항)
    index("event_world_id_sort_key_idx").on(t.worldId, t.sortKey),
    // 실제 렌더링 단위(단일 타임라인)의 시간순 조회 최적화
    index("event_timeline_id_sort_key_idx").on(t.timelineId, t.sortKey),
  ],
);

// ---------------------------------------------------------------------------
// event_character: Event <-> Character 다대다 조인 테이블.
// 조인 행 삭제는 CASCADE로 처리하되, Event/Character 본체는 보존한다
// (본체 삭제는 소프트 삭제로 별도 처리).
// ---------------------------------------------------------------------------
export const eventCharacter = pgTable(
  "event_character",
  {
    id: serial("id").primaryKey(),
    eventId: bigint("event_id", { mode: "number" })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    characterId: bigint("character_id", { mode: "number" })
      .notNull()
      .references(() => character.id, { onDelete: "cascade" }),
    // 해당 사건에서 인물의 역할/비중 메모 (예: "주동자", "목격자")
    role: text("role"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("event_character_event_id_character_id_key").on(
      t.eventId,
      t.characterId,
    ),
    index("event_character_event_id_idx").on(t.eventId),
    index("event_character_character_id_idx").on(t.characterId),
  ],
);

// ---------------------------------------------------------------------------
// event_place: Event <-> Place 다대다 조인 테이블.
// ---------------------------------------------------------------------------
export const eventPlace = pgTable(
  "event_place",
  {
    id: serial("id").primaryKey(),
    eventId: bigint("event_id", { mode: "number" })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    placeId: bigint("place_id", { mode: "number" })
      .notNull()
      .references(() => place.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("event_place_event_id_place_id_key").on(t.eventId, t.placeId),
    index("event_place_event_id_idx").on(t.eventId),
    index("event_place_place_id_idx").on(t.placeId),
  ],
);
