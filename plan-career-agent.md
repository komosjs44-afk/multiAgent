# Evidence-based Career Agent 구현 계획

## 프로젝트 목적

Evidence-based Career Agent는 대학생의 전공, 성적, 프로젝트, 자격증, 활동 이력과 목표 진로를 기반으로 현재 부족 역량을 분석하고, 실행 가능한 보완 루틴과 4주 성장 로드맵을 제공하는 AI Career Agent이다.

현재 MVP는 공기업 전산직 준비생을 우선 대상으로 한다.

## 현재 구현 상태

현재 구현은 `career-agent-web` Next.js 웹앱 기준이다.

구현 완료:

- 프로필 입력 UI
- 분석 API Route
- 데모 공고 fallback
- 공고 요구역량 기반 분석
- 역량 기반 예상 적합도 계산
- 추천 자격증 생성
- 보완 루틴 생성
- 4주 성장 로드맵 생성
- 시스템 예상 문제점과 해결책 생성
- Markdown 리포트 복사

현재 공고 데이터 흐름:

1. `/api/analyze-career`가 사용자 프로필을 받는다.
2. `fetchJobPostings`가 공고 데이터를 조회한다.
3. `ALIO_OPEN_API_URL`, `ALIO_OPEN_API_KEY`가 있으면 외부 API 호출을 시도한다.
4. API 설정이 없거나 실패하면 데모 공고 fallback을 사용한다.
5. `analyzeCareer`가 프로필과 공고 요구역량을 비교한다.
6. 분석 결과를 UI와 Markdown 리포트로 출력한다.

중요:

- 현재 공고는 실제 API 데이터가 아니라 데모 데이터이다.
- 점수는 실제 합격률이 아니라 이력서 검증 전 역량 매칭 점수이다.
- UI와 문서에서는 “역량 기반 예상 적합도”라고 표현한다.

## 추가 개발 계획: Login 기반 Career DB + Evidence 저장

### 목표

사용자 로그인 후 개인 Career DB를 생성하고, 수상/프로젝트/자격증/활동 이력을 Evidence로 저장한다.

저장된 Evidence는 Career Agent 분석에 반영되어 공기업 전산직 요구역량과 매칭된다.

### DB 테이블 방향

1. profiles
- id
- user_id
- name
- university
- major
- grade
- target_career
- created_at
- updated_at

2. academic_records
- id
- user_id
- course_name
- credit
- grade
- semester
- skill_mapping
- created_at

3. evidence_records
- id
- user_id
- type
- title
- organization
- description
- role
- result
- skills
- evidence_text
- created_at
- updated_at

4. career_analysis_history
- id
- user_id
- input_snapshot
- result_snapshot
- score
- created_at

### Evidence type

- award
- project
- certificate
- hackathon
- study
- internship
- activity

### 기능 흐름

1. 사용자가 로그인한다.
2. Career Profile을 입력한다.
3. 성적표 PDF를 업로드한다.
4. AI가 과목명, 학점, 성적을 추출한다.
5. 사용자가 추출 결과를 확인/수정한다.
6. 수상/프로젝트/자격증/활동을 Evidence로 추가한다.
7. Agent가 Evidence를 기술역량으로 변환한다.
8. 실제 공고 또는 데모 공고와 비교한다.
9. 역량 기반 예상 적합도와 보완 루틴을 생성한다.

## 구현 시 주의사항

- 데모 공고는 실제 API 데이터처럼 보이지 않도록 UI에서 “데모 공고 - API 미연결”로 표시한다.
- 실제 공고 API 연동 시 공고 원본 `rawText`를 저장해 매칭 근거를 추적한다.
- 성적표 PDF 원본은 기본 저장하지 않고, 사용자가 확인한 추출 결과만 저장한다.
- 개인정보 및 학업 정보 저장 전 명시적 동의 UI를 제공한다.
- 분석 결과는 입력 스냅샷과 결과 스냅샷을 함께 저장해 재현 가능성을 확보한다.

## 향후 v2 방향

- 실제 잡알리오/공공데이터 API 연동
- API 실패 시 demo fallback 유지
- LLM 설명문 생성과 rule-based fallback 병행
- 성적표 PDF 분석
- Evidence 기반 역량 매핑
- 로그인 기반 개인 Career DB
- 분석 이력 저장 및 이전 분석과 비교
