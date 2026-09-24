import { NextRequest } from "next/server";

import type { Db } from "@/lib/db";

/**
 * 라우트 핸들러를 테스트에서 직접 부르기 위한 도구 모음.
 *
 * 핸들러는 그냥 `(request, { params })`를 받는 함수라 서버를 띄우지 않고도
 * 부를 수 있다. 막히는 것은 `withDb`뿐이다. 이 함수가 요청마다 Neon
 * 커넥션을 새로 여는데, 테스트에는 네트워크도 DATABASE_URL도 없다.
 *
 * 그래서 테스트 파일에서 `@/lib/db`를 모킹해 `withDb`만 아래 `withTestDb`로
 * 바꿔 끼운다. 스키마 같은 나머지 export는 원본을 그대로 쓴다.
 *
 * ```ts
 * vi.mock("@/lib/db", async (importOriginal) => {
 *   const actual = await importOriginal<typeof import("@/lib/db")>();
 *   const { withTestDb } = await import("@/lib/api/route-test");
 *   return { ...actual, withDb: withTestDb };
 * });
 * ```
 */

let current: Db | null = null;

/** 이후 `withTestDb` 호출이 쓸 DB를 정한다. beforeEach에서 부른다. */
export function setRouteDb(db: Db | null): void {
  current = db;
}

/** 라우트가 부르는 `withDb`를 대신한다. 커넥션을 열지 않고 테스트 DB를 넘긴다. */
export function withTestDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  if (!current) {
    throw new Error(
      "setRouteDb로 테스트 DB를 먼저 지정해야 한다. beforeEach를 확인할 것.",
    );
  }
  return fn(current);
}

/**
 * 핸들러에 넘길 요청을 만든다.
 *
 * 경로는 핸들러가 읽지 않지만(params로 따로 받는다) NextRequest가 절대 URL을
 * 요구하므로 형식만 갖춘다.
 */
export function jsonRequest(
  method: "POST" | "PATCH" | "DELETE" | "GET",
  body?: unknown,
): NextRequest {
  return new NextRequest("http://test.local/api", {
    method,
    ...(body === undefined
      ? {}
      : {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        }),
  });
}

/**
 * 본문을 날것 그대로 보내는 요청. 깨진 JSON처럼 직렬화할 수 없는 경우에 쓴다.
 */
export function rawRequest(
  method: "POST" | "PATCH",
  body: string,
): NextRequest {
  return new NextRequest("http://test.local/api", {
    method,
    body,
    headers: { "content-type": "application/json" },
  });
}

/**
 * 핸들러의 두 번째 인자를 만든다.
 *
 * Next 16에서 `params`는 Promise다. 값은 항상 문자열이다 — URL에서 오기
 * 때문이며, 숫자로 바꾸는 책임은 핸들러에 있다. 테스트도 그 모양을 지킨다.
 */
export function routeParams<T extends Record<string, string>>(
  params: T,
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

/** 응답의 상태 코드와 JSON 본문을 함께 꺼낸다. */
export async function readJson(
  response: Response,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: response.status, body: await response.json() };
}
