import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // OpenNext(Cloudflare) 빌드 산출물 - 생성된 번들이라 린트 대상이 아니다.
    ".open-next/**",
    ".wrangler/**",
  ]),
  // 서식은 Prettier가 맡는다. 서식 규칙을 끄는 설정이라 맨 뒤에 둬야 앞의 것을 덮는다.
  prettier,
]);

export default eslintConfig;
