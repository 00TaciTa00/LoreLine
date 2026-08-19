import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

export type Db = NeonDatabase<typeof schema>;

/**
 * 요청마다 새 커넥션 풀을 만들어 Drizzle 클라이언트를 반환한다.
 *
 * 모듈 스코프에 Pool을 두면 Cloudflare Workers(workerd)에서 간헐적으로 500이
 * 발생한다. 첫 요청에서 만들어진 WebSocket이 다음 요청의 컨텍스트에서 재사용되면
 * "Cannot perform I/O on behalf of a different request"로 거부되기 때문이다.
 * 따라서 풀은 요청 단위로 만들고 응답 후 close()로 정리해야 한다.
 *
 * HTTP(fetch) 드라이버 대신 WebSocket 드라이버를 쓰는 이유: Event 생성 시
 * event + event_place + event_character를 한 트랜잭션으로 묶어야 하고
 * sort_key 재정렬(rebalanceTimeline)도 트랜잭션이 필요한데, `neon-http`는
 * 세션 트랜잭션을 지원하지 않아 `db.transaction()` 호출 시 예외가 발생한다.
 */
export function createDb(): { db: Db; close: () => Promise<void> } {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString });
  return {
    db: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
}

/**
 * Route Handler 본문을 감싸 요청 단위 커넥션의 생성/정리를 보장한다.
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const { db, close } = createDb();
  try {
    return await fn(db);
  } finally {
    await close();
  }
}

export * from "./schema";
