import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 요청에서 들어오는 값을 검사하는 도구.
 *
 * 라우트가 `await request.json()`을 그냥 부르고 `Number(worldId)`를 그냥 쓰던
 * 시절에는, 깨진 본문이 오면 400이 아니라 예외가 그대로 올라가 500이 됐고
 * `/api/worlds/abc/...` 같은 요청이 어떻게 끝나는지 아무도 정해두지 않았다.
 */

/** 잘못된 요청에 쓰는 400 응답. 메시지 모양을 한곳에서 정한다. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * 요청 본문을 JSON 객체로 읽는다. 읽을 수 없으면 null.
 *
 * 본문이 비었거나, JSON이 아니거나, 배열·숫자처럼 객체가 아닌 경우를 모두
 * 같은 실패로 본다. 라우트는 어차피 `body.name`처럼 필드를 꺼내 쓴다.
 */
export async function readJsonBody(
  request: NextRequest,
): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const INVALID_BODY_MESSAGE = "요청 본문이 올바른 JSON 객체가 아닙니다.";

/**
 * 경로의 숫자 id를 읽는다. 양의 정수가 아니면 null.
 *
 * `Number("abc")`는 NaN이고, 그대로 질의에 넣으면 드라이버까지 내려가 무슨
 * 일이 날지 알 수 없다. 여기서 막는다. id는 serial이라 1부터 시작한다.
 */
export function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const INVALID_ID_MESSAGE = "경로의 id가 올바른 숫자가 아닙니다.";

/** 경로 id가 잘못됐을 때의 400 응답. */
export function invalidId(): NextResponse {
  return badRequest(INVALID_ID_MESSAGE);
}

/** 본문이 잘못됐을 때의 400 응답. */
export function invalidBody(): NextResponse {
  return badRequest(INVALID_BODY_MESSAGE);
}
