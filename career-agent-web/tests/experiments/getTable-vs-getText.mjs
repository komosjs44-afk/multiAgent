// Standalone experiment (not part of `npm test`, not wired into any API route).
//
// Goal: sanity-check pdf-parse's getTable() against getText() before deciding whether it's
// worth pursuing as a production extraction path (see Phase 1 report, section G).
//
// We don't have a real transcript PDF to test with (personal data, and none exists in this
// repo), so this script builds a minimal synthetic PDF in memory: a 2-row x 5-column table
// drawn with real vector line operators (m/l/S), the same kind of grid a university's PDF
// export would draw. Text uses ASCII (Helvetica/WinAnsi) instead of Hangul, because embedding
// a CID font by hand is out of scope for a throwaway structural check — this still exercises
// getTable()'s grid-detection geometry, which is what actually matters here.
//
// Run with: node tests/experiments/getTable-vs-getText.mjs

import { PDFParse } from "pdf-parse";

function buildSyntheticTablePdf() {
  const header = "1 w\n";
  const hLines = [180, 150, 120].map((y) => `20 ${y} m 380 ${y} l S`).join("\n");
  const vLines = [20, 90, 170, 260, 320, 380].map((x) => `${x} 120 m ${x} 180 l S`).join("\n");

  const cells = [
    ["Category", 28, 163],
    ["Code", 98, 163],
    ["Name", 178, 163],
    ["Credit", 265, 163],
    ["Grade", 330, 163],
    ["Elective", 28, 133],
    ["CSE301", 98, 133],
    ["Database Systems", 178, 133],
    ["3", 280, 133],
    ["A+", 335, 133],
  ];
  const text = cells
    .map(([value, x, y]) => `BT /F1 10 Tf ${x} ${y} Td (${value}) Tj ET`)
    .join("\n");

  return buildPdfFromContent(`${header}${hLines}\n${vLines}\n${text}\n`);
}

function buildPdfFromContent(content) {
  const contentBytes = Buffer.from(content, "latin1");

  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 400 200] /Contents 4 0 R >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  let offset = chunks[0].length;

  for (const num of [1, 2, 3]) {
    const body = `${num} 0 obj\n${objects[num]}\nendobj\n`;
    offsets[num] = offset;
    chunks.push(body);
    offset += body.length;
  }

  offsets[4] = offset;
  const streamHeader = `4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`;
  const streamFooter = `\nendstream\nendobj\n`;
  chunks.push(streamHeader);
  offset += streamHeader.length;
  offset += contentBytes.length;
  chunks.push(contentBytes);
  chunks.push(streamFooter);
  offset += streamFooter.length;

  offsets[5] = offset;
  const obj5 = `5 0 obj\n${objects[5]}\nendobj\n`;
  chunks.push(obj5);
  offset += obj5.length;

  const xrefOffset = offset;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(xref);
  chunks.push(trailer);

  return Buffer.concat(chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "latin1"))));
}

function buildSyntheticNoGridPdf() {
  // Same cell text/positions as the grid PDF, but with zero line-draw operators — mimics a
  // transcript whose columns are only whitespace-aligned, not ruled with vector lines.
  const cells = [
    ["Category", 28, 163],
    ["Code", 98, 163],
    ["Name", 178, 163],
    ["Credit", 265, 163],
    ["Grade", 330, 163],
    ["Elective", 28, 133],
    ["CSE301", 98, 133],
    ["Database Systems", 178, 133],
    ["3", 280, 133],
    ["A+", 335, 133],
  ];
  const text = cells
    .map(([value, x, y]) => `BT /F1 10 Tf ${x} ${y} Td (${value}) Tj ET`)
    .join("\n");
  return buildPdfFromContent(`${text}\n`);
}

async function inspect(label, pdfBytes) {
  const parser = new PDFParse({ data: pdfBytes });
  try {
    console.log(`\n########## ${label} ##########`);
    console.log("=== getText() ===");
    const textResult = await parser.getText({ lineEnforce: true, lineThreshold: 4.6, cellSeparator: "\t", cellThreshold: 7 });
    console.log(textResult.pages[0]?.text ?? "(no text)");

    console.log("\n=== getTable() ===");
    const tableResult = await parser.getTable();
    console.log(`pages with tables: ${tableResult.pages.length}`);
    for (const page of tableResult.pages) {
      console.log(`page ${page.num}: ${page.tables.length} table(s)`);
      for (const table of page.tables) {
        for (const row of table) console.log("  " + JSON.stringify(row));
      }
    }
    console.log(`mergedTables: ${JSON.stringify(tableResult.mergedTables)}`);
  } finally {
    await parser.destroy();
  }
}

async function main() {
  await inspect("vector-grid PDF (ruled table)", buildSyntheticTablePdf());
  await inspect("no-grid PDF (whitespace-aligned only)", buildSyntheticNoGridPdf());
}

main().catch((error) => {
  console.error("experiment failed:", error);
  process.exitCode = 1;
});
