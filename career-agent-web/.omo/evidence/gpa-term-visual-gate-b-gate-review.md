# GPA / academic-term visual gate B

- recommendation: APPROVE
- blockers: []
- originalIntent: Preserve the transcript's official cumulative GPA as the editable and persisted value, keep the course-calculated GPA visibly secondary, and recover the displayed active academic term from valid course semesters when the stored version term is unclassified.
- desiredOutcome: The review modal shows official GPA 3.74 as the editable save value and calculated GPA 3.75 as a clearly labeled comparison; the saved academic summary shows average GPA 3.74 / 4.5 and current version 2026년 1학기 반영본 at desktop, tablet, and mobile widths without page-level clipping or inaccessible visible labels.
- userOutcomeReview: The supplied fresh screenshots and traced source satisfy the requested outcome. The modal labels 3.74 as both 공식 누적평점 and 최종 확인 GPA (저장값, 직접 수정 가능), while 3.75 appears only under 과목 계산 평점. The persistence path sends confirmedGpa and resolves it before declared/calculated fallbacks. The academic summary resolves an invalid active academic_term against visible course semesters and renders 2026년 1학기 반영본. The 1265/753/375 bitmap widths consistently represent the requested 1280/768/390 browser widths minus a 15px vertical scrollbar gutter.

## Checked artifacts

- `C:\tmp\gpa-semester-fixed-desktop.png` — PNG signature valid; 1440x1863; captured after relevant source edits.
- `C:\tmp\gpa-semester-summary-desktop.png` — PNG signature valid; 1265x1842; captured after relevant source edits.
- `C:\tmp\gpa-semester-summary-tablet.png` — PNG signature valid; 753x1842; captured after relevant source edits.
- `C:\tmp\gpa-semester-summary-mobile.png` — PNG signature valid; 375x2588; captured after relevant source edits.
- `app/profile/_components/sections/TranscriptReviewOverview.tsx`
- `app/profile/_components/sections/useTranscriptReview.ts`
- `app/profile/_components/sections/SubjectSection.tsx`
- `app/profile/page.tsx`
- `app/api/evidence/extract/route.ts`
- `app/api/academic-transcripts/route.ts`
- `lib/transcriptParser.ts`
- `lib/transcriptSaveContract.ts`
- `tests/transcriptParser.test.mjs`
- `tests/transcriptPipeline.test.mjs`

## Evidence

- Modal screenshot: official cumulative GPA is `3.74 / 4.5`; course-calculated GPA is `3.75 / 4.5`; the labeled editable field contains `3.74`.
- Saved summary screenshots: `평균 평점 3.74 / 4.5` and `현재 반영본 2026년 1학기 반영본` appear at all three responsive widths.
- `TranscriptReviewOverview.tsx:79-105`: official and calculated values use distinct visible labels; the editable control is nested in a visible `<label>`.
- `useTranscriptReview.ts:211-230`: the field value becomes `confirmedGpa` in the save request.
- `transcriptSaveContract.ts:21-30`: `confirmedGpa` has first persistence precedence.
- `SubjectSection.tsx:163-169,418-421`: invalid stored term is resolved from visible course semesters before display.
- `transcriptParser.ts:57-68`: only valid `YYYY-[12]` terms participate and the latest valid semester is returned.
- `page.tsx:367-371`: the partial next mobile tab is within an intentional `overflow-x-auto` tab strip, not page overflow.
- Targeted test run: 23 passed, 0 failed. It includes official `3.74`, calculated `3.75`, confirmed-GPA precedence, initial official-GPA selection, and latest-valid-semester fallback.

## Responsive and accessibility review

- Desktop/tablet/mobile content remains inside the viewport; no card, statistic, Korean label, baseline, or action is visibly clipped.
- The fixed bottom analysis bar overlays the document while scrolling but does not truncate the full-page content.
- The mobile tab row intentionally exposes part of the next tab and is horizontally scrollable by source contract; no body-level horizontal overflow is visible.
- Korean labels wrap naturally. No isolated particle, one-character orphan, mojibake, tofu glyph, or clipped descender appears in the PNGs.
- GPA hierarchy is unambiguous: official first, calculated second, editable saved value explicitly labeled.

## Direct slop / overfit pass

- No deletion-only, requested-removal-only, tautological, prose-pinning, or implementation-mirroring test was found for the reviewed behavior.
- The GPA tests distinguish official `3.74`, calculated/fallback values, and confirmed values, so precedence regressions cannot pass accidentally.
- The term fallback test uses an invalid stored term and multiple course semesters, exercising the actual selection behavior.
- `resolveAcademicTerm` and GPA precedence helpers are shared production seams, not test-only extraction or speculative normalization.
- No narrow-diff maintenance or false-confidence blocker was found.

## Exact evidence gaps / notes

- No separate executor report, code-review report, manual-QA matrix, or notepad path was provided to this independent gate; direct artifact inspection and reproduction supplied the required coverage.
- The standalone `TranscriptUploadPanel` still formats its own `activeVersion.academic_term` directly. That surface is not present in the supplied responsive summary artifacts and is not a blocker for the stated academic-summary criterion, but it is a consistency note if the broader goal intends every active-version label in the application to share the fallback.
- No interaction-state screenshot was supplied for keyboard focus or tab scrolling; semantic source inspection confirms the visible GPA label association and the intentional horizontal scroll container.
