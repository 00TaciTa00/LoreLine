import { describe, expect, it } from "vitest";

import {
  AUTO_COLORS,
  NEUTRAL_COLORS,
  PRESET_COLORS,
  isValidHexColor,
  normalizeHexColor,
  pickColor,
} from "./colors";

describe("pickColor", () => {
  it("팔레트를 순환하며 배정한다", () => {
    expect(pickColor(0)).toBe(AUTO_COLORS[0]);
    expect(pickColor(AUTO_COLORS.length)).toBe(AUTO_COLORS[0]);
    expect(pickColor(AUTO_COLORS.length + 1)).toBe(AUTO_COLORS[1]);
  });

  it("자동 배정에는 무채색을 쓰지 않는다", () => {
    // 흰색이 자동 배정되면 흰 배경에서 보이지 않고,
    // 검정은 기본 글자색과 구분되지 않는다.
    const auto: readonly string[] = AUTO_COLORS;
    for (const neutral of NEUTRAL_COLORS) {
      expect(auto).not.toContain(neutral);
    }
  });
});

describe("PRESET_COLORS", () => {
  it("사용자가 고를 수 있는 목록에는 무채색도 포함된다", () => {
    for (const neutral of NEUTRAL_COLORS) {
      expect(PRESET_COLORS).toContain(neutral);
    }
  });

  it("흰색과 검정을 모두 제공한다", () => {
    expect(PRESET_COLORS).toContain("#ffffff");
    expect(PRESET_COLORS).toContain("#000000");
  });
});

describe("isValidHexColor", () => {
  it("3자리와 6자리를 받는다", () => {
    expect(isValidHexColor("#abc")).toBe(true);
    expect(isValidHexColor("#a1b2c3")).toBe(true);
    expect(isValidHexColor("#ABC")).toBe(true);
  });

  it("그 밖의 형식은 거부한다", () => {
    expect(isValidHexColor("abc")).toBe(false);
    expect(isValidHexColor("#ab")).toBe(false);
    expect(isValidHexColor("#abcd")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("normalizeHexColor", () => {
  it("6자리를 소문자로 통일한다", () => {
    expect(normalizeHexColor("#A1B2C3")).toBe("#a1b2c3");
  });

  it("3자리를 6자리로 펼친다", () => {
    expect(normalizeHexColor("#abc")).toBe("#aabbcc");
    expect(normalizeHexColor("#FFF")).toBe("#ffffff");
  });

  it("# 없이 입력해도 받아준다", () => {
    expect(normalizeHexColor("3b82f6")).toBe("#3b82f6");
    expect(normalizeHexColor("abc")).toBe("#aabbcc");
  });

  it("앞뒤 공백을 무시한다", () => {
    expect(normalizeHexColor("  #3b82f6  ")).toBe("#3b82f6");
  });

  it("해석할 수 없으면 null", () => {
    expect(normalizeHexColor("red")).toBeNull();
    expect(normalizeHexColor("#12")).toBeNull();
    expect(normalizeHexColor("")).toBeNull();
    expect(normalizeHexColor("#12345")).toBeNull();
  });

  it("무채색도 그대로 통과한다", () => {
    expect(normalizeHexColor("#ffffff")).toBe("#ffffff");
    expect(normalizeHexColor("#000")).toBe("#000000");
  });
});
