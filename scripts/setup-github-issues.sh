#!/usr/bin/env bash
#
# ROADMAP.md에 남아 있던 작업을 GitHub Issue로 옮긴다.
#
#   gh auth login   # 먼저 이걸 해야 한다 (브라우저 승인 필요)
#   bash scripts/setup-github-issues.sh
#
# 라벨·마일스톤·이슈를 만든다. 이미 있으면 건너뛰므로 다시 돌려도 안전하다.
set -euo pipefail

REPO="00TaciTa00/LoreLine"

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub 인증이 필요합니다. 먼저 'gh auth login'을 실행하세요." >&2
  exit 1
fi

# 이슈 기능이 꺼져 있으면 이슈를 만들 수 없다.
if [ "$(gh repo view "$REPO" --json hasIssuesEnabled -q .hasIssuesEnabled)" != "true" ]; then
  echo "저장소의 Issues 기능이 꺼져 있습니다." >&2
  echo "Settings > General > Features > Issues 를 켠 뒤 다시 실행하세요." >&2
  exit 1
fi

echo "== 라벨 =="
# 혼자 쓰는 저장소라 라벨을 잘게 나누지 않는다. 종류만 구분한다.
add_label() {
  if gh label create "$1" --repo "$REPO" --color "$2" --description "$3" 2>/dev/null; then
    echo "  만듦: $1"
  else
    echo "  이미 있음: $1"
  fi
}
add_label "버그"   "d73a4a" "동작이 기대와 다름"
add_label "기능"   "0e8a16" "새로 만드는 것"
add_label "개선"   "1d76db" "이미 있는 것을 낫게"
add_label "인프라" "5319e7" "배포·CI·DB 등 바깥쪽"
add_label "문서"   "6a737d" "설명과 기록"

echo "== 마일스톤 =="
add_milestone() {
  if gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null 2>&1; then
    echo "  만듦: $1"
  else
    echo "  이미 있음(또는 실패): $1"
  fi
}
add_milestone "사용성 개선" "쓰면서 불편했던 것들"
add_milestone "테스트·품질" "회귀를 막는 장치"
add_milestone "확장성"     "데이터가 늘었을 때 필요해지는 것"

echo "== 이슈 =="
# 제목이 같은 열린 이슈가 있으면 건너뛴다.
add_issue() {
  local title="$1" body="$2" label="$3" milestone="$4"
  if gh issue list --repo "$REPO" --state open --search "\"$title\" in:title" --json title -q '.[].title' | grep -qxF "$title"; then
    echo "  이미 있음: $title"
    return
  fi
  gh issue create --repo "$REPO" --title "$title" --body "$body" \
    --label "$label" --milestone "$milestone" >/dev/null
  echo "  만듦: $title"
}

add_issue "기존 사건의 상위 기간 옮기기" \
"시간 탭이 생기기 전에 만든 사건들은 상위 기간이 비어 있고, 하위 시각에 \"제3 성력, 알라그 시대\"처럼 두 단계가 한 칸에 들어 있다.

시간 탭에서 기간을 만들고 각 사건의 상위 기간을 지정한 뒤, 하위 시각에서 중복되는 부분을 지워야 한다.

쉼표로 기계적으로 나눌 수도 있지만 소설 데이터라 추측으로 바꾸지 않았다." \
"개선" "사용성 개선"

add_issue "공간·인물 탭에 검색 넣기" \
"사건 폼의 공간·인물 선택은 검색 방식으로 바꿨는데 공간 탭과 인물 탭 목록에는 검색이 없다. 항목이 늘면 같은 불편이 생긴다.

주의: 두 탭은 끌어서 순서를 바꿀 수 있다. 검색으로 걸러진 상태에서 끌면 순서가 헷갈리므로, 검색 중에는 드래그를 막는 식의 처리가 필요하다." \
"개선" "사용성 개선"

add_issue "터치·키보드로 순서 바꾸기" \
"순서 변경은 HTML5 드래그로 만들어서 터치와 키보드로는 쓸 수 없다.

사건은 수정 팝업의 \"작중 순서\" 선택이 대체 경로로 남아 있지만, 공간·인물·시간에는 그런 수단이 없다. 모바일에서는 순서를 바꿀 방법이 아예 없다." \
"개선" "사용성 개선"

add_issue "복수 Timeline 관리 UI" \
"스키마와 API는 세계관당 여러 타임라인을 지원하지만, UI는 \"메인 타임라인\" 하나를 자동으로 만들어 쓴다(lib/db/timelines.ts).

한 세계관에 여러 연표가 필요해지면 그때 만든다." \
"기능" "사용성 개선"

add_issue "E2E 테스트" \
"단위 테스트는 순수 함수와 DB 로직을 덮지만, 화면 흐름(사건 생성 → 격자 배치 → 교차 탐색)은 사람이 브라우저로 확인하고 있다.

같은 회귀가 반복되면 그때 붙인다." \
"기능" "테스트·품질"

add_issue "sort_key 부분 재정렬" \
"rebalanceTimeline이 타임라인 전체를 다시 채번한다. 사건이 수천 건 쌓이기 전에는 문제가 되지 않는다.

좁아진 구간 주변만 재정렬하는 방식으로 바꿀 수 있다." \
"개선" "확장성"

add_issue "Neon pooled 연결 분리" \
"앱과 마이그레이션이 direct 연결 문자열 하나를 함께 쓴다. 동시 접속이 늘면 앱용 pooled(-pooler) 문자열을 DATABASE_URL로, direct를 DATABASE_URL_UNPOOLED로 나눠야 한다.

형식은 .env.example에 적어두었다." \
"인프라" "확장성"

echo
echo "끝났습니다. 확인: gh issue list --repo $REPO"
