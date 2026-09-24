import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { parseId, readJsonBody } from "./request";

describe("parseId", () => {
  it("양의 정수 문자열을 숫자로 읽는다", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
  });

  it("숫자로 와도 읽는다", () => {
    expect(parseId(7)).toBe(7);
  });

  it.each([
    ["숫자가 아닌 문자열", "abc"],
    ["빈 문자열", ""],
    ["0", "0"],
    ["음수", "-3"],
    ["소수", "1.5"],
    ["undefined", undefined],
    ["null", null],
    ["객체", {}],
  ])("%s이면 null이다", (_label, value) => {
    expect(parseId(value)).toBeNull();
  });
});

describe("readJsonBody", () => {
  function request(body: string) {
    return new NextRequest("http://test.local/api", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    });
  }

  it("JSON 객체를 읽는다", async () => {
    expect(await readJsonBody(request('{"name":"하나"}'))).toEqual({
      name: "하나",
    });
  });

  it.each([
    ["깨진 JSON", "{name:"],
    ["빈 본문", ""],
    ["배열", "[1,2]"],
    ["숫자", "42"],
    ["null", "null"],
  ])("%s이면 null이다", async (_label, body) => {
    expect(await readJsonBody(request(body))).toBeNull();
  });
});
