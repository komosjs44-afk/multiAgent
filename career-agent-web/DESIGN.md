# Career Agent Web Design System

## 1. Atmosphere & Identity

Career Agent는 차분하고 신뢰할 수 있는 학업·취업 준비 도구다. 짙은 네이비와 종이색 배경을 기본으로, 라임 포인트가 중요한 행동과 진행 상태를 명확히 구분한다. 서명 요소는 둥근 패널 안에 밀도 높은 정보를 안정적으로 정리하는 구조다.

## 2. Color

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Brand/primary | `--navy` | `#10182b` | 주요 텍스트, CTA |
| Brand/hover | `--navy-2` | `#1b2740` | 주요 CTA hover |
| Surface/base | `--paper` | `#f6f5f1` | 페이지 및 보조 패널 |
| Surface/secondary | `--paper-2` | `#eeece5` | 깊이 구분 |
| Accent/primary | `--lime` | `#c8ff4d` | 강조 CTA |
| Accent/soft | `--lime-soft` | `#e9ffc2` | 강조 hover 및 배지 |
| Text/primary | `--ink` | `#10182b` | 제목과 본문 |
| Text/muted | `--muted` | `#8a93a6` | 보조 설명 |
| Border/default | `--line` | `#dcd8ca` | 입력창과 패널 경계 |

상태색은 기존 Tailwind의 emerald, amber, red, slate 계열만 사용한다. 새 색상 역할이 필요하면 먼저 이 표에 추가한다.

## 3. Typography

| Level | Family | Size | Weight | Usage |
| --- | --- | --- | --- | --- |
| Page title | Sora | `text-3xl` 이상 | 800 | 페이지 제목 |
| Section title | Sora | `text-lg`~`text-2xl` | 800 | 카드와 모달 제목 |
| Body | Inter | `text-base` | 400~600 | 기본 본문 |
| Body small | Inter | `text-sm` | 400~800 | 폼과 설명 |
| Caption | Inter | `text-xs` | 500~800 | 라벨과 메타데이터 |

제목은 Sora, 나머지는 Inter를 사용한다. 한글 제목과 라벨은 의미 단위가 어색하게 고립되지 않도록 충분한 가로 공간을 확보한다.

## 4. Spacing & Layout

- 기본 간격 단위는 4px이며 Tailwind의 표준 spacing scale을 사용한다.
- 모바일 페이지 여백과 오버레이 안전 여백은 16px이다.
- 공용 카드 내부 여백은 16~24px을 사용한다.
- 반응형 기준은 Tailwind 기본 `sm` 640px, `md` 768px, `lg` 1024px을 따른다.
- 넓은 작업 모달은 최대 60rem이며, 뷰포트가 좁으면 `calc(100vw - 2rem)`으로 축소한다.
- 모달은 헤더와 푸터를 고정 영역으로 두고 본문만 세로 스크롤을 소유한다. 가로 스크롤은 허용하지 않는다.
- 폼 그리드의 모든 자식은 `min-width: 0`과 `width: 100%`로 축소 가능해야 한다.

## 5. Components

### Modal

- **Structure**: backdrop → `header / scroll body / footer` 3행 그리드.
- **Variants**: `default`는 소형 편집용, `wide`는 성적표처럼 다열 폼을 포함하는 작업용.
- **Spacing**: 16px 뷰포트 안전 여백, 24px 내부 여백, 20px 영역 간격.
- **States**: 열림, 닫힘, 본문 스크롤, 버튼 disabled/loading.
- **Accessibility**: 닫기 버튼에 이름을 제공하고, 키보드 포커스가 보이는 기존 버튼 스타일을 유지한다.
- **Motion**: 별도 장식 모션을 추가하지 않는다.
- **Layout**: `scroll-body-shell`; 본문만 `overflow-y: auto`, `overflow-x: hidden`.

### Transcript course grid

- **Structure**: 학기·과목코드 2열 → 과목명 1열 → 이수구분·학점·성적 3열 → 행 작업 버튼.
- **Variants**: `md` 이상 다열, 그 미만은 모든 필드를 1열로 배치.
- **Spacing**: 필드 간 8px, 행 내부 12px.
- **States**: 입력, 삭제, 빈 값, 긴 과목명.
- **Accessibility**: 모든 입력은 표시 라벨과 연결된 `<label>` 내부에 둔다.
- **Motion**: 없음.
- **Layout**: 중첩 CSS Grid. 모든 트랙과 자식은 축소 가능하며 가로 스크롤을 만들지 않는다.

### Buttons

- **Variants**: `.btn-dark`, `.btn-light`, destructive text/button.
- **States**: default, hover, disabled/loading.
- **Accessibility**: 실제 동작은 `<button>`을 사용하고 disabled 상태를 속성으로 전달한다.

## 6. Motion & Interaction

- 상호작용 피드백은 기존 `transition`과 transform 기반 hover만 사용한다.
- 레이아웃 속성은 애니메이션하지 않는다.
- 새로운 장식 애니메이션을 추가하지 않는다.
- 모달 본문 스크롤 중 헤더와 저장 버튼 영역은 제자리에 유지한다.

## 7. Depth & Surface

혼합 전략을 사용한다. 일반 카드와 입력은 얇은 `--line` 경계로 구분하고, 최상위 모달만 기존 `shadow-2xl`을 사용해 오버레이 깊이를 표현한다. 내부 폼 영역은 `--paper` 또는 slate 계열의 미세한 톤 차이로 구분한다.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- 목표는 WCAG 2.2 AA다.
- 모든 입력은 화면 폭 320px 이상에서 가로 스크롤 없이 접근 가능해야 한다.
- 모달의 전체 저장 버튼은 본문 길이와 관계없이 모달 내부에서 노출되어야 한다.
- 키보드 사용자가 닫기, 입력, 삭제, 저장 동작에 접근할 수 있어야 한다.
- 200% 텍스트 확대에서도 주요 폼이 한 열로 재배치되어야 한다.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
| --- | --- | --- | --- |
| 포커스 트랩과 Escape 닫기 미구현 | 공유 `Modal` | 이번 요청은 레이아웃 복구에 한정되며 기존 동작을 보존한다. | 공용 모달 접근성 개선 작업에서 해결 |

