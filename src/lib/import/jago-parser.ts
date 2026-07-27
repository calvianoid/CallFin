/**
 * Parser for Bank Jago "Pockets Transactions History" PDF exports.
 *
 * Jago only exports PDF (no CSV), so we extract positioned text with pdf.js and
 * reconstruct the table from x/y coordinates. Layout (from a real export):
 *
 *   Date & Time | Source/Destination | Transaction Details | Notes | Amount | Balance
 *
 * Rules:
 *   - Rows are grouped under a month header ("July 2026") — ignored.
 *   - A transaction starts on the line carrying a "DD Mon YYYY" date; following
 *     lines (time, wrapped merchant name, payment method, account no., ID#) belong
 *     to the same transaction until the next date line.
 *   - Amount is signed: "+" → income, "−/-" → expense (kept as-is, incl. internal
 *     "Movement between Pockets"). Indonesian grouping: "1.259.117" = 1259117.
 *   - There is no category column; we guess one from the merchant/details text.
 */

import type { NormalizedTx, ParseResult, RawMoneyLoverRow } from "./money-lover-parser";

/** A single positioned text fragment from a PDF page. */
export interface JagoTextItem {
  str: string;
  x: number;
  y: number;
}
export interface JagoPage {
  items: JagoTextItem[];
}

/** Label used for every imported Jago row's source wallet (mapped in the wizard). */
export const JAGO_WALLET = "Jago";
const UNCATEGORIZED = "Uncategorized";

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// Fallback column x-positions (absolute), used when the header row can't be found.
const FALLBACK_COLS = { date: 64, source: 260, details: 576, notes: 883, amount: 1380, balance: 1710 };

const DATE_RE = /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/;
const MONTH_HEADER_RE =
  /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i;
// Payment rails / banks that mark the end of the merchant name in the source cell.
const METHOD_RE =
  /^(gopay|shopeepay|ovo|dana|linkaja|link aja|qris|bca|bni|bri|mandiri|bank mandiri|cimb|cimb niaga|permata|danamon|seabank|blu|jenius|jago|bank jago|digital card|virtual account|va)\b/i;

function parseJagoDate(s: string): string | null {
  const m = s.match(DATE_RE);
  if (!m) return null;
  const mm = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

/** Parse a signed Indonesian amount → { amount (abs), kind }. */
function parseSignedAmount(s: string): { amount: number; expense: boolean } | null {
  if (!/\d/.test(s)) return null;
  const expense = /[-−]/.test(s);
  const amount = parseInt(s.replace(/[^\d]/g, ""), 10);
  if (!amount) return null;
  return { amount, expense };
}

// ── Category guessing from merchant / details text ──────────────────────────
// Maps keyword → a default CallFin category name. Only applied when the mapped
// category actually exists (the wizard falls back to manual mapping otherwise).
const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/geprek|ayam|bakso|mie|warung|warteg|nasi|kopi|coffee|cafe|resto|resutoran|makan|sate|sushi|pizza|burger|kfc|mcd|mcdonald|starbucks|chatime|kebab|martabak|roti|bakery|seblak|dimsum|sembako|toko|food|drink|gofood|grabfood/i, "Food & Drinks"],
  [/shopee|tokopedia|tokped|lazada|blibli|zalora|uniqlo|mall|store|olshop|belanja|shop\b/i, "Shopping"],
  [/grab|gojek|gocar|goride|maxim|mrt|krl|transjakarta|kereta|taksi|taxi|angkot|busway|travel/i, "Transportation"],
  [/parkir|parking/i, "Parking"],
  [/pertamina|shell|spbu|bensin|bbm|vivo\b|\bbp\b|fuel/i, "Fuel"],
  [/pln|listrik/i, "Electricity Bill"],
  [/pdam|air minum|water/i, "Water Bill"],
  [/indihome|wifi|internet|biznet|firstmedia|myrepublic/i, "Internet Bill"],
  [/pulsa|telkomsel|indosat|smartfren|\bxl\b|axis|\btri\b/i, "Phone & Mobile"],
];

export function suggestJagoCategory(text: string): string | null {
  for (const [re, cat] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return null;
}

// ── Core: reconstruct transactions from positioned text ─────────────────────

function detectColumns(items: JagoTextItem[]) {
  const find = (label: string) =>
    items.find((it) => it.str.trim().toLowerCase() === label.toLowerCase());
  const date = find("Date & Time");
  const source = find("Source/Destination");
  const details = find("Transaction Details");
  const notes = find("Notes");
  const amount = find("Amount");
  const balance = find("Balance");
  if (date && source && details && notes && amount && balance) {
    return {
      headerY: date.y,
      cols: {
        date: date.x, source: source.x, details: details.x,
        notes: notes.x, amount: amount.x, balance: balance.x,
      },
    };
  }
  return { headerY: null as number | null, cols: FALLBACK_COLS };
}

type Col = "date" | "source" | "details" | "notes" | "amount" | "balance";

function columnOf(x: number, cols: typeof FALLBACK_COLS): Col {
  // Left-aligned columns use the next column's left edge as the boundary so
  // wrapped names stay put; the right-aligned Amount/Balance use midpoints.
  const b4 = (cols.notes + cols.amount) / 2;
  const b5 = (cols.amount + cols.balance) / 2;
  if (x < cols.source) return "date";
  if (x < cols.details) return "source";
  if (x < cols.notes) return "details";
  if (x < b4) return "notes";
  if (x < b5) return "amount";
  return "balance";
}

/** Group items sharing (near) the same baseline into visual lines, top→bottom. */
function toLines(items: JagoTextItem[]): { y: number; items: JagoTextItem[] }[] {
  const buckets = new Map<number, JagoTextItem[]>();
  for (const it of items) {
    const key = Math.round(it.y / 3) * 3;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(it);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, its]) => ({ y, items: its.sort((a, b) => a.x - b.x) }));
}

/** Extract merchant name from the source-cell lines (stop at method/account). */
function extractMerchant(sourceLines: string[]): string {
  const parts: string[] = [];
  for (const raw of sourceLines) {
    const line = raw.trim();
    if (!line) continue;
    if (METHOD_RE.test(line) || /\d{8,}/.test(line)) break;
    parts.push(line);
  }
  return parts.join(" ").trim();
}

function parsePageBlocks(page: JagoPage, out: NormalizedTx[], errors: ParseResult["errors"]) {
  const { headerY, cols } = detectColumns(page.items);

  // Region: strictly below the header row, above the disclaimer/footer.
  const disclaimer = page.items.find((it) => /^disclaimer/i.test(it.str.trim()));
  const topY = headerY != null ? headerY - 4 : Infinity;
  const bottomY = disclaimer ? disclaimer.y + 4 : -Infinity;

  const region = page.items.filter(
    (it) =>
      it.str.trim() &&
      it.y < topY &&
      it.y > bottomY &&
      !MONTH_HEADER_RE.test(it.str.trim()),
  );
  if (region.length === 0) return;

  // Anchor = a date-column line carrying a date. Sort top→bottom.
  const anchors = region
    .filter((it) => columnOf(it.x, cols) === "date" && DATE_RE.test(it.str))
    .map((it) => it.y)
    .sort((a, b) => b - a);
  if (anchors.length === 0) return;

  // A transaction's content flows downward from its own date line to just above
  // the next one, so a block spans (nextAnchor, thisAnchor]. The small epsilon
  // catches a Note that renders a few px above its row's baseline.
  const EPS = 6;
  const upper = (i: number) => anchors[i] + EPS;
  const lower = (i: number) => (i === anchors.length - 1 ? -Infinity : anchors[i + 1] + EPS);

  for (let i = 0; i < anchors.length; i++) {
    const hi = upper(i);
    const lo = lower(i);
    const blockItems = region.filter((it) => it.y <= hi && it.y > lo);

    const byCol: Record<Col, JagoTextItem[]> = {
      date: [], source: [], details: [], notes: [], amount: [], balance: [],
    };
    for (const it of blockItems) byCol[columnOf(it.x, cols)].push(it);

    const joinCol = (c: Col) =>
      toLines(byCol[c]).map((l) => l.items.map((it) => it.str).join(" ")).join(" ").replace(/\s+/g, " ").trim();
    const sourceLines = toLines(byCol.source).map((l) => l.items.map((it) => it.str).join(" "));

    const dateStr = joinCol("date");
    const iso = parseJagoDate(dateStr);
    const amt = parseSignedAmount(joinCol("amount"));

    if (!iso || !amt) {
      errors.push({ row: out.length + errors.length + 1, reason: `Baris tak terbaca: "${dateStr} ${joinCol("source")}".` });
      continue;
    }

    const detailsStr = joinCol("details").replace(/ID#.*/i, "").trim();
    const notes = joinCol("notes");
    const merchant = extractMerchant(sourceLines);
    const isMovement = /movement between pockets/i.test(detailsStr) || /movement between pockets/i.test(merchant);

    const base = isMovement
      ? "Movement between Pockets"
      : merchant || detailsStr || "Jago transaction";
    const description = notes ? `${base} — ${notes}` : base;

    const category = suggestJagoCategory(`${merchant} ${detailsStr} ${notes}`) ?? UNCATEGORIZED;

    out.push({
      kind: amt.expense ? "expense" : "income",
      date: iso,
      amount: amt.amount,
      category,
      wallet: JAGO_WALLET,
      description,
    });
  }
}

/** Pure parser: reconstruct transactions from positioned text of every page. */
export function parseJagoTextItems(pages: JagoPage[]): ParseResult {
  const normalized: NormalizedTx[] = [];
  const errors: ParseResult["errors"] = [];

  for (const page of pages) parsePageBlocks(page, normalized, errors);

  normalized.sort((a, b) => a.date.localeCompare(b.date));

  const catSet = new Set<string>();
  for (const n of normalized) catSet.add(n.category);

  return {
    rows: [] as RawMoneyLoverRow[],
    normalized,
    uniqueCategories: Array.from(catSet).sort(),
    uniqueWallets: [JAGO_WALLET],
    errors,
  };
}

/** Browser entry point: read a Jago PDF File and parse it. */
export async function parseJagoPdf(file: File): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist");
  // Load the worker as a bundled asset URL (synced to the installed version).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: JagoPage[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items: JagoTextItem[] = tc.items
      .map((it) => ("str" in it ? { str: it.str, x: it.transform[4], y: it.transform[5] } : null))
      .filter((it): it is JagoTextItem => it !== null && it.str.trim() !== "");
    pages.push({ items });
  }

  const result = parseJagoTextItems(pages);
  if (result.normalized.length === 0) {
    throw new Error("Tidak ada transaksi terbaca dari PDF Jago ini. Pastikan file dari Jago → Pockets Transactions History.");
  }
  return result;
}
