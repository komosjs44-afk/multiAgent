export interface TranscriptGpaCandidates {
  readonly confirmedGpa: number | null;
  readonly declaredGpa: number | null;
  readonly summaryOverallGpa: number | null;
  readonly calculatedGpa: number | null;
  readonly aggregateGpa: number | null;
}

export interface TranscriptInitialGpaCandidates {
  readonly declaredGpa: number | null;
  readonly summaryOverallGpa: number | null;
  readonly extractedGpa: number | null;
}

export function resolveInitialTranscriptGpa(
  candidates: TranscriptInitialGpaCandidates,
): number | null {
  return candidates.declaredGpa ?? candidates.summaryOverallGpa ?? candidates.extractedGpa;
}

export function resolveConfirmedTranscriptGpa(
  candidates: TranscriptGpaCandidates,
): number | null {
  return (
    candidates.confirmedGpa ??
    candidates.declaredGpa ??
    candidates.summaryOverallGpa ??
    candidates.calculatedGpa ??
    candidates.aggregateGpa
  );
}

export interface TranscriptPersistenceOperations<TVersion> {
  readonly createVersion: () => Promise<TVersion>;
  readonly insertCourses: (version: TVersion) => Promise<unknown>;
  readonly insertSemesterSummaries: (version: TVersion) => Promise<unknown>;
  readonly cleanup: (version: TVersion) => Promise<unknown>;
}

export async function persistTranscriptBundle<TVersion>(
  operations: TranscriptPersistenceOperations<TVersion>,
): Promise<TVersion> {
  const version = await operations.createVersion();
  try {
    await operations.insertCourses(version);
    await operations.insertSemesterSummaries(version);
    return version;
  } catch (saveError) {
    try {
      await operations.cleanup(version);
    } catch (cleanupError) {
      throw new AggregateError(
        [saveError, cleanupError],
        "성적표 저장과 부분 데이터 정리에 모두 실패했습니다.",
      );
    }
    throw saveError;
  }
}
