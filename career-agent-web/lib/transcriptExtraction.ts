import { PDFParse } from "pdf-parse";

export type TranscriptExtractionMethod = "pdf-text" | "ocr";

export interface TranscriptSourcePage {
  readonly page: number;
  readonly text: string;
}

export interface PdfTextItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
}

export interface PdfTextRow {
  readonly y: number;
  readonly items: readonly PdfTextItem[];
  readonly text: string;
}

export interface TranscriptTextExtraction {
  readonly method: TranscriptExtractionMethod;
  readonly pages: readonly TranscriptSourcePage[];
  readonly originalText: string;
}

export interface TranscriptTextExtractor {
  extract(file: File): Promise<TranscriptTextExtraction>;
}

export interface TranscriptOcrProvider {
  extract(file: File): Promise<TranscriptTextExtraction>;
}

export interface TranscriptFallbackAssessment {
  readonly needed: boolean;
  readonly reasons: readonly string[];
}

export class OcrFallbackUnavailableError extends Error {
  readonly reasons: readonly string[];

  constructor(reasons: readonly string[]) {
    super(
      "PDF 텍스트 레이어에서 성적표 행을 확인할 수 없습니다. 이미지 기반 PDF라면 OCR 연결이 필요하므로, 텍스트 선택이 가능한 PDF를 업로드하거나 직접 입력해주세요.",
    );
    this.name = "OcrFallbackUnavailableError";
    this.reasons = reasons;
  }
}

export function groupPdfTextItemsIntoRows(
  items: readonly PdfTextItem[],
  yTolerance = 4.6,
): readonly PdfTextRow[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: PdfTextItem[][] = [];

  for (const item of sorted) {
    const row = groups.find((candidate) => Math.abs((candidate[0]?.y ?? item.y) - item.y) <= yTolerance);
    if (row) row.push(item);
    else groups.push([item]);
  }

  return groups.map((row) => {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    return {
      y: ordered[0]?.y ?? 0,
      items: ordered,
      text: ordered.map((item) => item.text).join("\t"),
    };
  });
}

export function assessTranscriptTextQuality(
  pages: readonly TranscriptSourcePage[],
): TranscriptFallbackAssessment {
  const text = pages.map((page) => page.text).join("\n");
  const compactLength = text.replace(/\s/g, "").length;
  const hasSemester = /\d{4}\s*학년도?\s*[12]\s*학기|\d{4}\s*[-./년]\s*[12]\s*학기?/.test(text);
  const hasCourseCode = /[A-Z]{1,5}[-]?\d{2,4}[A-Z0-9]*/.test(text);
  const reasons: string[] = [];

  if (compactLength < 40) reasons.push("추출된 텍스트가 너무 짧습니다.");
  if (!hasSemester) reasons.push("학기 표기를 찾지 못했습니다.");
  if (!hasCourseCode) reasons.push("과목코드를 찾지 못했습니다.");

  return { needed: reasons.length > 0, reasons };
}

export async function extractTranscriptText(
  file: File,
  pdfExtractor: TranscriptTextExtractor,
  ocrProvider?: TranscriptOcrProvider,
): Promise<TranscriptTextExtraction> {
  const pdfText = await pdfExtractor.extract(file);
  const assessment = assessTranscriptTextQuality(pdfText.pages);
  if (!assessment.needed) return pdfText;
  if (!ocrProvider) throw new OcrFallbackUnavailableError(assessment.reasons);
  return ocrProvider.extract(file);
}

export class PdfTextLayerExtractor implements TranscriptTextExtractor {
  async extract(file: File): Promise<TranscriptTextExtraction> {
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });

    try {
      const result = await parser.getText({
        lineEnforce: true,
        lineThreshold: 4.6,
        cellSeparator: "\t",
        cellThreshold: 7,
        pageJoiner: "",
      });
      const pages = result.pages.map((page) => ({ page: page.num, text: page.text }));
      return {
        method: "pdf-text",
        pages,
        originalText: pages.map((page) => page.text).join("\n\f\n"),
      };
    } finally {
      await parser.destroy();
    }
  }
}
