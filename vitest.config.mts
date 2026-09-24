import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = {
  "@": fileURLToPath(new URL("./", import.meta.url)),
};

/**
 * 테스트를 두 묶음으로 나눈다.
 *
 * `*.db.test.ts`는 PGlite로 진짜 Postgres를 띄운다. WASM이라 한 파일당 메모리를
 * 꽤 쓰는데, 파일마다 워커가 따로 뜨면 여러 개가 동시에 올라가 "Fatal process
 * out of memory: Zone"으로 죽는다. 남은 메모리에 따라 되기도 하고 안 되기도
 * 해서 더 나쁘다. 그래서 DB 묶음만 한 번에 하나씩 돌린다.
 *
 * 나누는 기준을 위치(lib/db 아래)가 아니라 **파일 이름**으로 둔다. 라우트
 * 핸들러 테스트도 PGlite를 쓰는데 app/api 아래 살기 때문이다.
 *
 * 순수 로직 묶음은 가벼우므로 그대로 병렬로 둔다.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: [
            "node_modules/**",
            ".next/**",
            ".open-next/**",
            "**/*.db.test.ts",
          ],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          environment: "node",
          include: ["**/*.db.test.ts"],
          exclude: ["node_modules/**", ".next/**", ".open-next/**"],
          fileParallelism: false,
        },
      },
    ],
  },
});
