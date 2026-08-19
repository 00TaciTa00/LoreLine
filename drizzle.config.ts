import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// 마이그레이션은 세션/트랜잭션 상태(SET 등)가 필요할 수 있어 PgBouncer
// 풀링을 거치지 않는 direct(non-pooled) 연결을 사용해야 한다.
// `neon env pull` 등으로 DATABASE_URL_UNPOOLED가 있으면 그것을 우선 사용하고,
// 없으면 DATABASE_URL(호스트에 -pooler가 없는 direct 문자열이어야 함)로 폴백한다.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
