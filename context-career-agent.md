# Evidence-based Career Agent Context

## 프로젝트 개요

Evidence-based Career Agent는 공기업 전산직 준비생을 위한 Career Agent MVP이다.

사용자의 전공, 학년, 보유 기술, 프로젝트, 자격증, 활동 이력을 바탕으로 현재 강점과 부족 역량을 분석하고, 공고 요구역량과 매칭해 실행 가능한 보완 루틴과 4주 성장 로드맵을 제공한다.

현재 핵심 대상은 다음과 같다.

- 대상 사용자: 컴퓨터공학/AI/SW 계열 대학생
- 대표 페르소나: 컴퓨터공학 3학년, 공기업 전산직 준비생
- 핵심 문제: 현재 역량이 목표 공고 요구역량과 얼마나 맞는지 알기 어렵다.
- 핵심 가치: 추천이 아니라, 목표 진로에 필요한 부족 역량을 Evidence 기반으로 설계한다.

## 현재 구현 상태

현재 구현은 `career-agent-web` Next.js 웹앱 기준이다.

구현된 기능:

1. 사용자 프로필 입력
2. 목표 진로 입력
3. 보유 기술, 프로젝트, 자격증 입력
4. 데모 공고 기반 공고 추천
5. 공고 요구역량과 사용자 입력 역량 비교
6. 역량 기반 예상 적합도 계산
7. 부족 역량 도출
8. 추천 자격증 생성
9. 보완 루틴 생성
10. 4주 성장 로드맵 생성
11. 시스템 예상 문제점과 해결책 출력
12. Markdown 리포트 복사

현재 구현 파일 기준:

- `career-agent-web/lib/jobPostings.ts`: 공고 API 연동 진입점과 데모 공고 fallback 관리
- `career-agent-web/lib/careerAgent.ts`: 프로필, 공고, 요구역량 비교 및 분석 결과 생성
- `career-agent-web/app/api/analyze-career/route.ts`: 분석 API Route
- `career-agent-web/app/page.tsx`: 웹 UI
- `career-agent-web/lib/reportFormatter.ts`: 분석 결과 Markdown 리포트 생성
- `career-agent-web/types/career.ts`: 분석 결과 및 공고 타입 정의

## Career Agent 고도화 방향

이 프로젝트는 공기업 전산직 준비생을 위한 Evidence-based Career Agent MVP이다.

현재는 데모 공고 데이터를 기반으로 사용자 역량을 분석하지만, 향후 실제 잡알리오/공공데이터 API, 성적표 PDF 분석, 로그인 기반 Career DB, 수상/프로젝트 Evidence 저장 기능을 연결한다.

핵심 방향은 다음과 같다.

1. 공고 기반 역량 분석
2. 사용자별 Career Profile 저장
3. 성적표 PDF 기반 전공과목/성적 분석
4. 수상, 프로젝트, 자격증, 활동 이력 Evidence 저장
5. Evidence를 공기업 전산직 요구역량과 매핑
6. 부족 역량과 4주 성장 로드맵 생성

## 주의사항

- 현재 공공기관 예시 A/B/C는 실제 API 데이터가 아니라 데모 데이터이다.
- UI에서는 반드시 “데모 공고 - API 미연결”로 표시한다.
- 점수는 “합격률”이 아니라 “역량 기반 예상 적합도”로 표현한다.
- 성적표 PDF 원본은 기본 저장하지 않는다.
- 개인정보 저장 시 명시적 동의가 필요하다.

## 향후 연결 대상

- 잡알리오/공공데이터 API 기반 실제 공고 수집
- Supabase Auth 기반 로그인
- 사용자별 Career Profile DB
- 성적표 PDF 텍스트 추출 및 과목/성적 파싱
- 수상, 프로젝트, 자격증, 활동 Evidence 저장
- Evidence 기반 역량 매핑
- 분석 이력 저장 및 비교
