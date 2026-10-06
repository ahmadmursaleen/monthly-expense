/** Monthly PDF report (SPEC §7): `buildReport` turns data into display text, `renderReportPdf` lays it out. */
import PDFDocument from "pdfkit";
import { CATEGORIES, monthBounds, type CategoryId, type Transaction } from "./domain.js";

export interface ReportCategoryRow {
  category: CategoryId;
  label: string;
  count: number;
  totalCents: number;
  /** de-DE EUR, e.g. `1.234,56 €` */
  total: string;
  /** de-DE percent with one decimal, e.g. `40,0 %` */
  share: string;
}

export interface ReportTransactionRow {
  id: number;
  /** `06.10.2026` */
  date: string;
  description: string;
  categoryLabel: string;
  /** de-DE EUR */
  amount: string;
}

export interface Report {
  month: string;
  /** `Expense report: October 2026` */
  title: string;
  /** `Generated 06.10.2026 10:30` (server local time) */
  generatedAt: string;
  totalCents: number;
  /** de-DE EUR */
  total: string;
  count: number;
  /** Total desc, then category table order; only categories with spending. */
  categories: ReportCategoryRow[];
  /** Newest first: date desc, then id desc. */
  transactions: ReportTransactionRow[];
  empty: boolean;
}

export const EMPTY_MESSAGE = "No transactions this month.";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const percent = new Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatEuro(cents: number): string {
  return euro.format(cents / 100);
}

/** `October 2026` for `2026-10`. */
export function formatMonthTitle(month: string): string {
  monthBounds(month); // throws on an invalid month
  const [year, mon] = month.split("-");
  return `${MONTH_NAMES[Number(mon) - 1]} ${year}`;
}

/** `2026-10-06` → `06.10.2026`. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatDateTime(now: Date): string {
  return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const categoryIndex = new Map<string, number>(CATEGORIES.map((c, i) => [c.id, i]));
const categoryLabel = new Map<string, string>(CATEGORIES.map((c) => [c.id, c.label]));

/** Pure: builds the report text for a `YYYY-MM` month. Throws on an invalid month. */
export function buildReport(month: string, transactions: readonly Transaction[], now: Date): Report {
  const title = `Expense report: ${formatMonthTitle(month)}`;
  const totalCents = transactions.reduce((sum, t) => sum + t.amountCents, 0);

  const byCategory = new Map<CategoryId, { count: number; totalCents: number }>();
  for (const t of transactions) {
    const entry = byCategory.get(t.category) ?? { count: 0, totalCents: 0 };
    entry.count += 1;
    entry.totalCents += t.amountCents;
    byCategory.set(t.category, entry);
  }
  const categories: ReportCategoryRow[] = [...byCategory.entries()]
    .sort(
      ([a, x], [b, y]) => y.totalCents - x.totalCents || (categoryIndex.get(a) ?? 0) - (categoryIndex.get(b) ?? 0),
    )
    .map(([category, { count, totalCents: catCents }]) => ({
      category,
      label: categoryLabel.get(category) ?? category,
      count,
      totalCents: catCents,
      total: formatEuro(catCents),
      share: percent.format(totalCents > 0 ? catCents / totalCents : 0),
    }));

  const rows: ReportTransactionRow[] = [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
    .map((t) => ({
      id: t.id,
      date: formatDate(t.date),
      description: t.description,
      categoryLabel: categoryLabel.get(t.category) ?? t.category,
      amount: formatEuro(t.amountCents),
    }));

  return {
    month,
    title,
    generatedAt: `Generated ${formatDateTime(now)}`,
    totalCents,
    total: formatEuro(totalCents),
    count: transactions.length,
    categories,
    transactions: rows,
    empty: transactions.length === 0,
  };
}

interface Column {
  header: string;
  width: number;
  align: "left" | "right";
}

const MARGIN = 50;
const ROW_HEIGHT = 18;
const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

/** Renders the report as an A4 PDF (black and white friendly). */
export function renderReportPdf(report: Report): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, info: { Title: report.title } });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = MARGIN;
  const contentWidth = doc.page.width - 2 * MARGIN;
  const bottom = () => doc.page.height - MARGIN;

  doc.font(FONT_BOLD).fontSize(20).text(report.title, left, MARGIN, { width: contentWidth });
  doc.moveDown(0.3);
  doc.font(FONT).fontSize(10).fillColor("#444444").text(report.generatedAt, { width: contentWidth });
  doc.fillColor("black").moveDown(1);
  doc
    .font(FONT_BOLD)
    .fontSize(13)
    .text(`Total: ${report.total}`, { width: contentWidth, continued: false });
  doc
    .font(FONT)
    .fontSize(11)
    .text(`${report.count} ${report.count === 1 ? "transaction" : "transactions"}`, { width: contentWidth });
  doc.moveDown(1.5);

  if (report.empty) {
    doc.font(FONT).fontSize(12).text(EMPTY_MESSAGE, { width: contentWidth });
    doc.end();
    return done;
  }

  /** Draws one table row at the current y; text is clipped to one line per cell. */
  const drawRow = (columns: Column[], cells: string[], bold: boolean) => {
    const y = doc.y;
    let x = left;
    doc.font(bold ? FONT_BOLD : FONT).fontSize(10);
    columns.forEach((col, i) => {
      doc.text(cells[i], x + 2, y + 4, {
        width: col.width - 4,
        height: ROW_HEIGHT - 4,
        align: col.align,
        lineBreak: false,
        ellipsis: true,
      });
      x += col.width;
    });
    const lineY = y + ROW_HEIGHT;
    doc
      .moveTo(left, lineY)
      .lineTo(left + contentWidth, lineY)
      .lineWidth(bold ? 1 : 0.5)
      .strokeColor(bold ? "black" : "#999999")
      .stroke();
    doc.x = left;
    doc.y = lineY;
  };

  /** Draws a titled table; the header row repeats at the top of every new page. */
  const drawTable = (heading: string, columns: Column[], rows: string[][]) => {
    if (doc.y + 30 + 2 * ROW_HEIGHT > bottom()) doc.addPage();
    doc.font(FONT_BOLD).fontSize(13).text(heading, left, doc.y, { width: contentWidth });
    doc.moveDown(0.4);
    const header = columns.map((c) => c.header);
    drawRow(columns, header, true);
    for (const row of rows) {
      if (doc.y + ROW_HEIGHT > bottom()) {
        doc.addPage();
        doc.y = MARGIN;
        drawRow(columns, header, true);
      }
      drawRow(columns, row, false);
    }
    doc.moveDown(2);
  };

  const w = contentWidth;
  drawTable(
    "Spending by category",
    [
      { header: "Category", width: w * 0.46, align: "left" },
      { header: "Count", width: w * 0.14, align: "right" },
      { header: "Total", width: w * 0.24, align: "right" },
      { header: "Share", width: w * 0.16, align: "right" },
    ],
    report.categories.map((c) => [c.label, String(c.count), c.total, c.share]),
  );

  drawTable(
    "Transactions",
    [
      { header: "Date", width: w * 0.15, align: "left" },
      { header: "Description", width: w * 0.43, align: "left" },
      { header: "Category", width: w * 0.24, align: "left" },
      { header: "Amount", width: w * 0.18, align: "right" },
    ],
    report.transactions.map((t) => [t.date, t.description, t.categoryLabel, t.amount]),
  );

  doc.end();
  return done;
}
