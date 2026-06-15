# Career Agent Todo

## 현재 구현 완료

- [x] Next.js 웹앱 기반 프로필 입력 UI 생성
- [x] `/api/analyze-career` 분석 API 생성
- [x] 공고 데이터 조회 계층 생성
- [x] API 미설정 시 데모 공고 fallback 적용
- [x] 공고 요구역량 기반 추천 공고 생성
- [x] 역량 기반 예상 적합도 계산
- [x] 부족 역량 도출
- [x] 추천 자격증 생성
- [x] 보완 루틴 생성
- [x] 4주 성장 로드맵 생성
- [x] 시스템 예상 문제점과 해결책 생성
- [x] Markdown 리포트 복사 기능 적용
- [x] `ALIO_OPEN_API_URL`, `ALIO_OPEN_API_KEY` 환경변수 예시 추가

## TODO: Career Agent 고도화

### 1. UI 문구 수정

- [x] 공공기관 예시 A/B/C → 데모 공고 - API 미연결로 변경
- [x] 합격률 → 역량 기반 예상 적합도로 변경
- [x] API 상태 배지 추가: DEMO / LIVE

### 2. Login 기반 DB

- [ ] Supabase Auth 연결 확인
- [x] profiles 테이블 생성
- [x] 사용자별 profile 저장 기능 구현
- [x] 로그인 사용자 기준 데이터 조회 적용

### 3. Evidence 저장 기능

- [x] evidence_records 테이블 생성
- [x] Evidence 추가 폼 생성
- [x] Evidence 목록 조회
- [x] Evidence 삭제 기능
- [x] Evidence type 선택 기능 추가

### 4. Evidence 역량 매핑

- [ ] award/project/certificate/study 타입별 기본 skill mapping 작성
- [ ] Pay-Mate → DB, 백엔드, 시스템 설계로 매핑
- [ ] 해커톤 → 문제해결, 협업, 발표, 데이터 분석으로 매핑
- [ ] 정보보안 발표 → 보안, 클라우드, 문서화로 매핑

### 5. 성적표 PDF 분석

- [ ] PDF 업로드 UI 생성
- [ ] PDF 텍스트 추출
- [ ] 과목명/학점/성적 파싱
- [ ] 사용자 확인/수정 화면 생성
- [x] academic_records에 저장

### 6. 공고 API 연동

- [ ] ALIO_OPEN_API_URL 환경변수 확인
- [ ] ALIO_OPEN_API_KEY 환경변수 확인
- [ ] fetchAlioJobs 함수 생성
- [ ] API 실패 시 demo fallback 유지
- [x] 공고 원본 rawText 저장

## 추가 확인 필요

- [ ] 실제 잡알리오/공공데이터 API endpoint 확정
- [ ] API 응답 필드명 확인
- [ ] 데모 공고와 실제 공고를 구분하는 source/status 필드 확정
- [ ] 개인정보 저장 동의 문구 작성
- [ ] 성적표 PDF 원본 미저장 정책 UI 반영
