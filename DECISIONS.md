# 주요 결정 기록

작업하면서 내린 판단과 그 이유를 기록한다. "왜 이렇게 되어 있는지"가
코드만 봐서는 드러나지 않는 것들을 남기는 것이 목적이다.

---

## 2026-08-19

### 배포 플랫폼: Cloudflare Pages (Netlify·Vercel 제외)

- **Vercel 제외** — 2026-04 서드파티 OAuth 공급망 침해 이력을 이유로 처음부터 후보에서 제외.
- **Netlify 보류 → Cloudflare Pages 확정** — 초기 스펙에서는 "Cloudflare Pages 또는 Netlify"
  였고 한때 Netlify 쪽으로 기울었으나, 최종적으로 Cloudflare Pages로 확정했다.
  Netlify용 설정(`netlify.toml` 등)은 실제로 추가한 적이 없으므로 제거할 것도 없다.

### Cloudflare 어댑터: `@cloudflare/next-on-pages` → `@opennextjs/cloudflare`

- 처음에 스펙대로 `@cloudflare/next-on-pages`를 설치하려 했으나 **peer dependency 충돌로 실패**했다.
  이 어댑터는 `next@>=14.3.0 <=15.5.2`만 지원하는데 이 프로젝트는 **Next.js 16.3.1**이다.
- 대신 Cloudflare가 현재 권장하는 **`@opennextjs/cloudflare`**(peer: `next >=16.2.11`)를 사용한다.
- 이에 따라 `wrangler.jsonc` + `open-next.config.ts`를 두고, npm 스크립트는
  `cf:build` / `cf:preview` / `cf:deploy`로 정리했다.
- **`export const runtime = "edge"`는 넣지 않았다.** OpenNext는 Next.js 서버를
  workerd의 Node 호환 런타임에서 실행하므로 edge runtime 선언이 필요 없다
  (`nodejs_compat` 플래그로 처리).
- **배포 대상은 Pages가 아니라 Workers다.** 초기에 "Cloudflare Pages"로 이야기가 오갔고
  README에도 Pages 대시보드 설정값을 적었었는데, 빌드 산출물을 확인해보니
  `worker.js` + `assets/`를 만들고 `wrangler deploy`를 호출하는 **Workers Static Assets**
  방식이었다. Pages 프로젝트로 만들어 `.open-next/assets`를 출력 디렉토리로 지정하면
  정적 파일만 서빙되고 SSR·API 라우트가 전부 죽으므로, Git 연동은 Pages가 아니라
  **Workers Builds**를 써야 한다. (스펙 문구가 "Cloudflare Pages"였던 것은
  next-on-pages 시절 기준이고, 어댑터를 OpenNext로 바꾸면서 배포 표면도 바뀐 것이다.)

### DB 드라이버: `neon-http` → `neon-serverless` (WebSocket)

- 초기 세팅에서는 fetch 기반 `drizzle-orm/neon-http`를 골랐다. Edge 호환성이 좋아서였다.
- 그런데 **`neon-http`는 세션 트랜잭션을 지원하지 않는다**(`db.transaction()` 호출 시 예외).
  이 프로젝트는 트랜잭션이 두 군데 필수다:
  1. Event 생성 시 `event` + `event_place` + `event_character`를 원자적으로 넣어야 함
  2. `sort_key` 재정렬(`rebalanceTimeline`)
- 따라서 WebSocket 기반 `Pool` + `drizzle-orm/neon-serverless`로 변경했다.
  Cloudflare workerd와 Node 양쪽 모두 전역 `WebSocket`을 제공하므로 그대로 동작한다.

### 커넥션 풀은 반드시 요청 단위로 생성 (`withDb`)

- 모듈 스코프에 `Pool`을 하나 두는 흔한 패턴을 처음에 썼는데, **workerd에서 간헐적으로 500이 발생**했다.
  `wrangler dev`로 같은 엔드포인트를 3번 호출하니 `500 / 200 / 500`으로 번갈아 실패.
- 원인: 첫 요청에서 만들어진 WebSocket을 다음 요청 컨텍스트에서 재사용하면 workerd가
  *"Cannot perform I/O on behalf of a different request"*로 거부한다.
- 해결: `lib/db/index.ts`의 `withDb(fn)`가 요청마다 새 `Pool`을 만들고 `finally`에서 `close()`한다.
  모든 Route Handler와 헬퍼(`events.ts`, `sort-key.ts`, `timelines.ts`)는 `db`를 인자로 받는다.
- **로컬 `next dev`에서는 이 버그가 재현되지 않았다.** Cloudflare 런타임에서 실제로 돌려봐야만
  드러나는 문제라, 빌드 성공만으로 판단하면 안 된다는 게 이 건의 교훈이다.

### `ws` 패키지와 PGlite 폴백 제거

- **`ws`**: Node에 전역 `WebSocket`이 없던 시절을 대비한 폴백이었으나, 이 환경의
  Node 25.9에는 전역 `WebSocket`이 있고 workerd에도 있다. Node 전용 패키지를
  엣지 번들에 끌고 들어가는 위험만 남아 제거했다.
- **PGlite**: `DATABASE_URL`이 없을 때 로컬 임베디드 Postgres로 폴백하는 개발 편의 장치였다.
  실제 Neon 접속 정보가 확보되어 존재 이유가 사라졌고, WASM + 파일시스템을 쓰는 패키지라
  엣지 번들에 섞이면 위험해서 제거했다(`scripts/migrate-local.ts`, `db:migrate:local` 포함).

### Neon 연결 문자열: pooled와 direct 분리

- 앱 쿼리는 **pooled**(`-pooler` 호스트), 마이그레이션은 **direct**를 쓰는 것이 Neon 권장 방식이다.
  마이그레이션은 세션 상태(`SET` 등)에 의존할 수 있는데 PgBouncer 트랜잭션 모드에서는 이게 유지되지 않아,
  풀링을 거치면 `prepared statement "s0" already exists` 같은 *원인을 짐작하기 어려운* 에러로 실패할 수 있다.
- `drizzle.config.ts`는 `DATABASE_URL_UNPOOLED`를 우선 사용하고 없으면 `DATABASE_URL`로 폴백한다.
- 현재 `.env`에는 `DATABASE_URL` 하나만 있고 `-pooler`가 붙지 않은 direct 문자열이라
  마이그레이션은 정상 동작한다. 트래픽이 늘면 앱용으로 pooled 문자열을 따로 넣는 것이 좋다.

### Git: 커밋만 하고 push는 하지 않음

- 상황: GitHub 원격(`https://github.com/00TaciTa00/LoreLine`)에 push하고 싶다는 요청이 있었고,
  이어서 "판단대로 진행하되 기록을 남겨라", 마지막으로 **"push는 하지 마세요. 커밋까지만"** 지시를 받았다.
- 결정: **remote만 등록하고 커밋까지만 수행. push는 하지 않는다.** 가장 마지막 지시가 우선한다.
- push는 사용자가 직접 `git push -u origin main`으로 하면 된다. 다만 원격에 이미 다른
  히스토리가 있으면 거부될 수 있으니, 그때는 강제로 덮어쓰기 전에 원격 상태를 먼저 확인해야 한다.

### 커밋 메시지에 AI 관련 표기 금지

- 요청에 따라 `Generated with Claude Code`, `Co-Authored-By: Claude` 같은 트레일러를 넣지 않는다.
- 기존 히스토리에는 `Initial commit from Create Next App`(create-next-app이 자동 생성) 하나뿐이고
  AI 관련 문구가 없어 정리할 대상이 없었다.

### 테스트 데이터

- 동작 확인 과정에서 실제 Neon DB에 세계관 "아르텔 대륙기"와 공간 2개(왕궁/숲),
  인물 2개(에이린/카슬), 사건 1개(왕궁 회담)를 만들었다. 사용자 확인을 거쳐 **그대로 두기로** 했다.
- workerd 검증 중 만든 사건 "숲의 추격"은 삭제 경로 확인용으로 소프트 삭제되어 있다.
