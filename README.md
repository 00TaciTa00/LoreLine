# Loreline

소설 집필을 돕는 서사 관리 웹 서비스. 여러 세계관(World)을 관리하며,
각 세계관 안에서 작중 사건·전개를 작중 시간 순서로 타임라인/연표에 시각화한다.

계층 구조: `World(세계관) -> Timeline(시간축) -> Event(사건) - Place(공간)/Character(인물)`
(Event는 Place·Character와 다대다 관계)

## 기술 스택

- **프레임워크**: Next.js (App Router) + TypeScript
- **스타일**: Tailwind CSS
- **타임라인 렌더링**: vis-timeline
- **상태관리**: Zustand(클라이언트 UI 상태) + React Query(서버 데이터)
- **API**: Next.js Route Handler (`app/api/`) — 별도 백엔드 서버 없음
- **ORM**: Drizzle ORM
- **DB**: PostgreSQL (Neon 서버리스, scale-to-zero)
- **배포 대상**: Cloudflare Pages 또는 Netlify (Vercel 미사용)

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # DATABASE_URL 값 채우기 (Neon 연결 필수)
npm run db:migrate           # Neon DB에 마이그레이션 적용
npm run dev
```

`http://localhost:3000` 에서 확인.

Cloudflare 런타임(workerd)에서 확인하려면:

```bash
npm run cf:preview           # OpenNext 빌드 + wrangler dev
```

로컬 workerd에 `DATABASE_URL`을 넘기려면 `.dev.vars` 파일에
`DATABASE_URL=...` 한 줄을 둔다(gitignore 처리됨).

## DB / 마이그레이션 스크립트

| 스크립트 | 설명 |
| --- | --- |
| `npm run db:generate` | `lib/db/schema.ts` 기준으로 `drizzle/` 아래 마이그레이션 SQL 생성 |
| `npm run db:migrate` | 생성된 마이그레이션을 DB에 적용 (direct 연결 사용) |
| `npm run db:push` | 마이그레이션 파일 없이 스키마를 DB에 직접 반영 (프로토타이핑용) |
| `npm run db:studio` | Drizzle Studio로 DB 데이터 확인 |

연결 문자열은 두 종류를 구분해서 쓴다(Neon 권장):

- `DATABASE_URL` — 앱 쿼리용. 서버리스 환경의 동시 연결을 감당하도록
  PgBouncer로 풀링되는 **pooled** 문자열(호스트에 `-pooler`)을 쓴다.
- `DATABASE_URL_UNPOOLED` — 마이그레이션용 **direct** 문자열. 마이그레이션은
  세션 상태(`SET` 등)에 의존할 수 있어 풀링을 거치면 실패할 수 있다.
  없으면 `drizzle.config.ts`가 `DATABASE_URL`로 폴백한다.

스키마 설계 원칙(자세한 내용은 `lib/db/schema.ts` 주석 참고):

- 가상 시간축이므로 `DATE`/`TIMESTAMP` 대신 `Event.display_time`(라벨 문자열) +
  `Event.sort_key`(BIGINT, 정렬 전용)를 분리해서 사용한다. 채번 전략은
  `lib/db/sort-key.ts` 참고.
- 모든 핵심 테이블은 `world_id` FK로 세계관 단위 데이터 격리를 강제하며,
  `Event`는 `(world_id, sort_key)` 복합 인덱스로 시간순 조회를 최적화한다.
- `event_character` / `event_place` 조인 테이블은 복합 유니크 제약 +
  FK 컬럼별 인덱스를 가지며, `ON DELETE CASCADE`로 조인 행만 삭제되고
  사건/인물/공간 본체는 보존된다.
- 핵심 엔티티는 하드 삭제 대신 `deleted_at` 소프트 삭제를 사용한다.

## 구현된 기능 (이번 이터레이션)

- **World**: 목록/생성/이름 수정/삭제(소프트), 홈(`/`)에서 선택 시 `/worlds/[worldId]`로 이동
- **Place / Character**: 세계관 범위 CRUD + 목록 페이지(`/worlds/[worldId]/places`, `/characters`),
  색상 배정, 관련/등장 사건 펼쳐보기
- **Event**: 제목/작중 시각(`displayTime`)/내용/색상 + 공간·인물 다중 선택(둘 다 필수),
  `sort_key` 기반 정렬(`lib/db/sort-key.ts`)
- **타임라인 시각화**: `/worlds/[worldId]`에서 vis-timeline으로 렌더링, 전체/공간별/인물별
  뷰 토글(스윔레인), 좁은 화면에서는 세로 스윔레인 리스트로 자동 전환
- **교차 탐색**: 공간·인물 목록의 "관련/등장 사건" → `?eventId=`로 해당 사건 모달 자동 오픈,
  사건 모달의 "바로가기" 링크 → 공간/인물 목록의 해당 항목으로 이동
- Timeline(시간축) 엔티티는 세계관마다 "메인 타임라인" 하나를 자동 생성해 내부적으로만
  사용한다(별도 Timeline 관리 UI는 이번 범위에 포함하지 않음, `lib/db/timelines.ts` 참고)

## 폴더 구조

```
app/
  page.tsx                       세계관 목록/생성 (홈)
  api/worlds/...                 Route Handler (World/Event/Place/Character API)
  worlds/[worldId]/
    layout.tsx                   세계관 헤더(이름 수정/삭제) + 탭 네비게이션
    page.tsx, WorldTimelineView.tsx   타임라인 시각화 페이지
    places/page.tsx              공간 목록/CRUD
    characters/page.tsx          인물 목록/CRUD
  providers.tsx                  React Query Provider
lib/
  db/                    Drizzle 스키마, 요청 단위 DB 클라이언트(withDb), sort_key, 관계 조회 헬퍼
  api/                   클라이언트 fetch 타입/헬퍼
  query/                 엔티티별 React Query 훅
  timeline/              뷰 모드별 스윔레인 계산 로직
  colors.ts              Place/Character 색상 팔레트
components/
  timeline/               vis-timeline, 세로 리스트, 뷰 토글, 사건 폼 모달
  ui/                     Modal, ColorPicker 등 공용 UI
store/                    Zustand 스토어 (타임라인 뷰 모드 등 UI 상태)
drizzle/                  생성된 SQL 마이그레이션 파일
wrangler.jsonc            Cloudflare Workers 설정
open-next.config.ts       OpenNext(Cloudflare 어댑터) 설정
```

## 환경변수 / 시크릿 관리 원칙

- `DATABASE_URL` 등 민감 정보는 절대 커밋하지 않는다. `.env.example`은
  키 이름과 형식만 담은 템플릿이며, 실제 값은 `.env` / `.env.local`(gitignore 처리됨)에만 둔다.
- 로컬 workerd(`wrangler dev`)용 값은 `.dev.vars`에 둔다(역시 gitignore 처리됨).
- 배포 환경에서는 Cloudflare 대시보드의 Secret으로 등록하고,
  리포지토리나 빌드 로그에 값이 노출되지 않도록 한다.

## Cloudflare 배포

어댑터는 **`@opennextjs/cloudflare`**(OpenNext)를 쓴다. Cloudflare 공식
`@cloudflare/next-on-pages`는 `next@<=15.5.2`만 지원해 이 프로젝트(Next.js 16)에서는
설치 자체가 불가능하다.

```bash
npm run cf:build     # OpenNext 빌드 (.open-next/ 생성)
npm run cf:preview   # 빌드 + 로컬 workerd에서 실행
npm run cf:deploy    # 빌드 + Cloudflare에 배포
```

Cloudflare 대시보드에서 Git 연동으로 자동 빌드하는 경우 설정값:

| 항목 | 값 |
| --- | --- |
| Build command | `npm run cf:build` |
| Build output directory | `.open-next/assets` |
| 환경변수(Secret) | `DATABASE_URL` (필수) |

`DATABASE_URL`을 등록하지 않으면 요청 시점에 예외가 발생하므로 반드시 먼저 넣어야 한다.

### 런타임 관련 주의점

- **`export const runtime = "edge"`는 쓰지 않는다.** OpenNext는 Next.js 서버를
  workerd의 Node 호환 런타임에서 돌리므로, `wrangler.jsonc`의 `nodejs_compat`
  플래그로 충분하다.
- **DB 커넥션은 요청 단위로 생성한다**(`lib/db/index.ts`의 `withDb`). 모듈 스코프에
  `Pool`을 두면 workerd가 요청 간 I/O 객체 재사용을 막기 때문에
  *"Cannot perform I/O on behalf of a different request"*로 간헐적 500이 발생한다.
  이 문제는 로컬 `next dev`에서는 재현되지 않고 workerd에서만 드러난다.
- Neon 접속에는 WebSocket 기반 `Pool` + `drizzle-orm/neon-serverless`를 쓴다.
  fetch 기반 `neon-http`는 세션 트랜잭션을 지원하지 않아
  (`db.transaction()` 호출 시 예외) 사용할 수 없다.

배포 대상 선정 경위와 그 밖의 판단 근거는 [DECISIONS.md](./DECISIONS.md) 참고.
