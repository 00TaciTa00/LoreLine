import { describe, expect, it } from "vitest";

import { isEmptyRichText, richTextToPlainText } from "./RichTextEditor";

describe("isEmptyRichText", () => {
  it("빈 문자열은 비었다", () => {
    expect(isEmptyRichText("")).toBe(true);
  });

  it("Tiptap이 빈 상태에서 내놓는 빈 문단도 비었다", () => {
    expect(isEmptyRichText("<p></p>")).toBe(true);
    expect(isEmptyRichText("<p><br></p>")).toBe(true);
  });

  it("공백만 있는 문단도 비었다", () => {
    expect(isEmptyRichText("<p>   </p>")).toBe(true);
    expect(isEmptyRichText("<p>&nbsp;</p>")).toBe(true);
  });

  it("글자가 있으면 비지 않았다", () => {
    expect(isEmptyRichText("<p>내용</p>")).toBe(false);
  });
});

describe("richTextToPlainText", () => {
  it("태그를 지운다", () => {
    expect(richTextToPlainText("<p>안녕</p>")).toBe("안녕");
    expect(richTextToPlainText("<p><strong>굵게</strong> 보통</p>")).toBe(
      "굵게 보통",
    );
  });

  it("문단 사이가 붙지 않는다", () => {
    // 태그를 공백으로 바꾸므로 "첫째둘째"가 되면 안 된다.
    expect(richTextToPlainText("<p>첫째</p><p>둘째</p>")).toBe("첫째 둘째");
  });

  it("목록도 읽을 수 있게 펼친다", () => {
    expect(richTextToPlainText("<ul><li>하나</li><li>둘</li></ul>")).toBe(
      "하나 둘",
    );
  });

  it("엔티티를 되돌린다", () => {
    expect(richTextToPlainText("<p>a &amp; b</p>")).toBe("a & b");
    expect(richTextToPlainText("<p>&lt;태그&gt;</p>")).toBe("<태그>");
    expect(richTextToPlainText("<p>&quot;인용&quot;</p>")).toBe('"인용"');
  });

  it("연속 공백을 정리한다", () => {
    expect(richTextToPlainText("<p>a</p>\n\n  <p>b</p>")).toBe("a b");
  });

  it("평문이 들어와도 그대로 돌려준다", () => {
    // 서식 편집기 도입 전에 저장된 값이 이 경로로 들어온다.
    expect(richTextToPlainText("옛날 평문 설명")).toBe("옛날 평문 설명");
  });
});
