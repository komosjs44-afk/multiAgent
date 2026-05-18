# Evidence-based Career Agent 구현 계획

## 프로젝트 목적

Evidence-based Career Agent는 대학생의 수업, 성적, 프로젝트, 자격증, 활동 및 목표 진로를 기반으로 현재 부족한 역량을 분석하고, 부족한 역량을 채울 수 있는 추천 활동과 4주 실행 로드맵을 제공하는 AI Agent이다.

이 프로젝트는 수업용 일정공지 에이전트 구조를 기반으로 확장하며, 기존 프로젝트를 손상시키지 않는 방식으로 구현한다.

---

## 프로젝트 원칙

### 유지할 것

- `schedule_agent.py`는 수정하지 않는다.
- `sample_notices.txt`는 수정하지 않는다.
- 기존 일정공지 에이전트 구조는 유지한다.

### 새로 추가할 것

- `career_agent.py`
- `sample_profile.json`
- `context-career-agent.md`
- `todo-career-agent.md`

---

## MVP v1 목표

MVP v1은 Rule-based only로 구현한다.

목표 진로 후보를 여러 개 추천하지 않고, `sample_profile.json`에 입력된 목표 진로 하나를 기준으로 현재 상태와 필요한 역량의 차이를 분석한다.

1. 사용자 프로필 읽기
2. 수강 과목 및 성적 분석
3. 프로젝트 및 활동 분석
4. 목표 진로 하나 확인
5. 부족 역량 분석
6. 추천 활동 생성
7. 4주 실행 로드맵 생성

터미널 출력 항목:

1. 현재 강점
2. 부족 역량
3. 추천 활동
4. 4주 로드맵

---

## 제외 기능 (v1)

다음 기능은 MVP v1에서 구현하지 않는다.

- LLM API 연동
- API 키 사용
- fallback 모드
- 순수 LLM Prompting 기반 분석
- RAG
- VectorDB
- LangGraph
- Docker
- Google Calendar API
- 공모전 크롤링
- 학교 공지 자동 수집
- 팀원 추천
- 자소서 자동 작성
- 로그인 시스템
- DB 저장 기능

---

## 에이전트 구조

### 1. Profile Analyzer

역할:

사용자의 학업 및 활동 데이터를 분석한다.

입력:

- 학과
- 학년
- 수업
- 성적
- 프로젝트
- 자격증
- 활동
- 목표 진로

출력:

현재 역량 프로필

---

### 2. Career Gap Analyzer

역할:

목표 진로에 필요한 역량과 현재 상태를 비교하여 부족한 역량을 도출한다.

구현 방식:

Rule-based only

Rule-based:
진로별 필요 역량 딕셔너리 기반으로 분석한다.

예시:

공기업 전산직:
- DB
- 보안
- 네트워크
- 시스템 운영
- 협업 경험

MVP v1에서는 LLM 설명을 사용하지 않는다.

---

### 3. Roadmap Planner

역할:

부족 역량을 채우기 위한 4주 실행 계획을 생성한다.

출력:

실행 가능한 Markdown 로드맵

---

## 실행 방식

명령어:

```bash
python career_agent.py
```

프로그램 흐름:

```text
sample_profile.json 읽기
↓
Profile Analyzer
↓
Career Gap Analyzer
↓
Roadmap Planner
↓
현재 강점, 부족 역량, 추천 활동, 4주 로드맵 출력
```

---

## v2 확장 후보

MVP v1이 안정적으로 동작한 뒤 아래 기능을 검토한다.

- LLM API 연동
- API 키 기반 설정
- API 키가 없을 때 Rule-based fallback 실행
- 부족 이유와 추천 활동에 대한 LLM 설명 생성
- 목표 진로별 설명 문장 고도화
