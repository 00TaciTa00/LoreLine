/** 작중 시각을 가진 것(사건). 상위 기간은 고르지 않았을 수 있다. */
type HasDisplayTime = {
  era: { name: string } | null;
  displayTime: string;
};

/**
 * 작중 시각을 한 줄로 합친다. 예: "제3 성력 - 789년"
 *
 * 상위 기간이 없으면 하위만 보여준다. 화면마다 다르게 조합하면 같은 사건이
 * 곳에 따라 다르게 보이므로 한 곳에서만 만든다.
 */
export function formatDisplayTime(event: HasDisplayTime): string {
  const era = event.era?.name.trim();
  return era ? `${era} - ${event.displayTime}` : event.displayTime;
}

/**
 * 격자의 시각 열에 쓸 작중 시각. 상위와 하위를 줄로 나눈다.
 *
 * ```
 * 제3 성력 :
 * 789년
 * ```
 *
 * 한 줄로 두면 열 폭(10rem)에 넘쳐 접히는데, 끊기는 자리가 내용과 무관해
 * "제5 성력, 마법의" / "시대 - 모험가, 청년"처럼 갈라진다.
 *
 * 개행 문자만 넣고 DOM은 하나로 둔다. 보는 쪽에서 `whitespace-pre-line`으로
 * 살려야 한다. 넣지 않으면 HTML이 개행을 공백으로 뭉갠다.
 *
 * 콜론 앞은 줄바꿈 없는 공백(\u00a0)이다. 보통 공백을 쓰면 기간 이름이 긴
 * 경우 거기서 줄이 꺾여 콜론만 혼자 떨어진다("제3 성력, 알라그 시대" /
 * ":" / "연구 기간").
 *
 * 전체 보기 카드나 사건 폼 드롭다운처럼 한 줄이 맞는 곳은 formatDisplayTime을
 * 그대로 쓴다. 그래서 공용 함수를 고치지 않고 격자용을 따로 둔다.
 */
export function formatGridDisplayTime(event: HasDisplayTime): string {
  const era = event.era?.name.trim();
  return era ? `${era}\u00a0:\n${event.displayTime}` : event.displayTime;
}

/**
 * 격자에서 같은 행으로 묶을지 판단하는 값.
 *
 * 상위·하위가 모두 같아야 동시간대로 본다. 상위가 다른데 하위 이름만 겹치는
 * 경우("제3 성력 - 1년"과 "제4 성력 - 1년")를 한 행에 묶으면 안 된다.
 */
export function displayTimeKey(event: HasDisplayTime): string {
  return `${event.era?.name.trim() ?? ""} ${event.displayTime}`;
}
