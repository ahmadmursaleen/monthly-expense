/**
 * Test-only helper: extracts the text drawn on each page of a PDF produced by pdfkit.
 *
 * pdfkit deflates page content streams by default, so the raw bytes cannot be searched for text.
 * This walks the document structure (Pages /Kids -> Page /Contents -> stream), inflates each page's
 * content stream and decodes the hex strings of every `TJ` operator (pdfkit draws all text that way,
 * one `TJ` per `doc.text` call for single-line text). Standard fonts use WinAnsi codes; only the
 * non-Latin-1 code points the report uses (`€`, `…`) are mapped, everything else is decoded as Latin-1.
 */
import { inflateSync } from "node:zlib";

const WIN_ANSI_EXTRAS: Record<number, string> = { 0x80: "€", 0x85: "…" };

function decodeHex(hex: string): string {
  let out = "";
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    out += WIN_ANSI_EXTRAS[code] ?? String.fromCharCode(code);
  }
  return out;
}

/** Text runs of one content stream, in drawing order. */
function textRuns(content: string): string[] {
  const runs: string[] = [];
  for (const m of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
    const hexParts = [...m[1].matchAll(/<([0-9a-fA-F]*)>/g)].map((h) => h[1]);
    runs.push(decodeHex(hexParts.join("")));
  }
  return runs;
}

interface PdfObject {
  dict: string;
  stream?: Buffer;
}

function parseObjects(pdf: Buffer): Map<number, PdfObject> {
  const raw = pdf.toString("latin1");
  const objects = new Map<number, PdfObject>();
  const header = /(\d+) 0 obj\n/g;
  let m: RegExpExecArray | null;
  while ((m = header.exec(raw)) !== null) {
    const id = Number(m[1]);
    const start = m.index + m[0].length;
    const streamAt = raw.indexOf("\nstream\n", start);
    const endObj = raw.indexOf("endobj", start);
    if (streamAt !== -1 && streamAt < endObj) {
      const dict = raw.slice(start, streamAt);
      const length = Number(/\/Length (\d+)/.exec(dict)?.[1]);
      const dataStart = streamAt + "\nstream\n".length;
      let data = pdf.subarray(dataStart, dataStart + length);
      if (dict.includes("/FlateDecode")) data = inflateSync(data);
      objects.set(id, { dict, stream: data });
      header.lastIndex = dataStart + length;
    } else {
      objects.set(id, { dict: raw.slice(start, endObj) });
    }
  }
  return objects;
}

export interface PdfPageInfo {
  /** `[x0, y0, x1, y1]` in points. */
  mediaBox: number[];
  /** Text runs in drawing order. */
  text: string[];
}

/** Pages in document order with their media box and drawn text. */
export function extractPdfPages(pdf: Buffer): PdfPageInfo[] {
  const objects = parseObjects(pdf);
  const pagesObj = [...objects.values()].find((o) => /\/Type \/Pages\b/.test(o.dict));
  if (!pagesObj) throw new Error("PDF has no /Pages object");
  const kids = /\/Kids \[([^\]]*)\]/.exec(pagesObj.dict)?.[1] ?? "";
  const pageIds = [...kids.matchAll(/(\d+) 0 R/g)].map((k) => Number(k[1]));
  return pageIds.map((id) => {
    const page = objects.get(id);
    if (!page) throw new Error(`missing page object ${id}`);
    const contentsId = Number(/\/Contents (\d+) 0 R/.exec(page.dict)?.[1]);
    const contents = objects.get(contentsId)?.stream;
    const mediaBox = (/\/MediaBox \[([^\]]*)\]/.exec(page.dict)?.[1] ?? "").trim().split(/\s+/).map(Number);
    return { mediaBox, text: contents ? textRuns(contents.toString("latin1")) : [] };
  });
}
