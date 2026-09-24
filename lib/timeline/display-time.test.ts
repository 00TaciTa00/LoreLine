import { describe, expect, it } from "vitest";

import {
  displayTimeKey,
  formatDisplayTime,
  formatGridDisplayTime,
} from "./display-time";

describe("formatDisplayTime", () => {
  it("상위 기간이 있으면 하이픈으로 잇는다", () => {
    expect(
      formatDisplayTime({ era: { name: "제3 성력" }, displayTime: "789년" }),
    ).toBe("제3 성력 - 789년");
  });

  it("상위 기간이 없으면 하위 시각만 쓴다", () => {
    expect(formatDisplayTime({ era: null, displayTime: "789년" })).toBe(
      "789년",
    );
  });

  it("상위 기간이 공백뿐이면 없는 것으로 본다", () => {
    expect(
      formatDisplayTime({ era: { name: "   " }, displayTime: "789년" }),
    ).toBe("789년");
  });

  it("상위 기간의 앞뒤 공백은 정리한다", () => {
    expect(
      formatDisplayTime({ era: { name: " 제3 성력 " }, displayTime: "789년" }),
    ).toBe("제3 성력 - 789년");
  });
});

describe("formatGridDisplayTime", () => {
  // 콜론 앞은 보통 공백이 아니라  다. 기간 이름이 길 때 거기서 줄이
  // 꺾여 콜론만 혼자 떨어지는 것을 막는다.
  it("상위 기간이 있으면 콜론을 붙여 줄을 나눈다", () => {
    expect(
      formatGridDisplayTime({
        era: { name: "제3 성력" },
        displayTime: "789년",
      }),
    ).toBe("제3 성력\u00a0:\n789년");
  });

  it("상위 기간이 없으면 하위 시각만 쓴다 (빈 줄도 콜론도 없다)", () => {
    expect(formatGridDisplayTime({ era: null, displayTime: "789년" })).toBe(
      "789년",
    );
  });

  it("상위 기간이 공백뿐이면 없는 것으로 본다", () => {
    expect(
      formatGridDisplayTime({ era: { name: "   " }, displayTime: "789년" }),
    ).toBe("789년");
  });

  it("상위 기간의 앞뒤 공백은 정리한다", () => {
    expect(
      formatGridDisplayTime({
        era: { name: " 제3 성력 " },
        displayTime: "789년",
      }),
    ).toBe("제3 성력\u00a0:\n789년");
  });
});

describe("displayTimeKey", () => {
  it("상위와 하위가 모두 같아야 같은 값이다", () => {
    const a = displayTimeKey({ era: { name: "제3 성력" }, displayTime: "1년" });
    const b = displayTimeKey({ era: { name: "제3 성력" }, displayTime: "1년" });
    expect(a).toBe(b);
  });

  it("하위가 같아도 상위가 다르면 다른 값이다", () => {
    const a = displayTimeKey({ era: { name: "제3 성력" }, displayTime: "1년" });
    const b = displayTimeKey({ era: { name: "제4 성력" }, displayTime: "1년" });
    expect(a).not.toBe(b);
  });

  it("상위 유무가 다르면 다른 값이다", () => {
    const a = displayTimeKey({ era: { name: "제3 성력" }, displayTime: "1년" });
    const b = displayTimeKey({ era: null, displayTime: "1년" });
    expect(a).not.toBe(b);
  });

  it("상위가 비어 있는 것과 없는 것은 같게 본다", () => {
    const a = displayTimeKey({ era: { name: "" }, displayTime: "1년" });
    const b = displayTimeKey({ era: null, displayTime: "1년" });
    expect(a).toBe(b);
  });
});
