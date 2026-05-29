/**
 * Parser for Money Lover export files (CSV).
 * Expected columns (case-insensitive, order doesn't matter):
 *   Id, Date, Category, Amount, Currency, Wallet, Note, With, Event,
 *   Exclude from report, Members
 *
 * Special rules:
 *   - Dates are DD/MM/YYYY.
 *   - Amount is negative for expense, positive for income.
 *   - Category "Outgoing transfer" + "Incoming transfer" with matching date
 *     and absolute amount form a single Transfer.
 */

import Papa from "papaparse";

export interface RawMoneyLoverRow {
  id: string;
  date: string;          // DD/MM/YYYY
  category: string;
  amount: number;        // negative for expense, positive for income
  currency: string;
  wallet: string;
  note: string;
}

export interface NormalizedTx {
  kind: "income" | "expense" | "transfer";
  date: string;          // ISO YYYY-MM-DD
  amount: number;        // always positive
  category: string;      // raw Money Lover category name (to be mapped)
  wallet: string;        // source wallet name (to be mapped)
  toWallet?: string;     // destination — set when kind === "transfer"
  description: string;
}

export interface ParseResult {
  rows: RawMoneyLoverRow[];
  normalized: NormalizedTx[];
  /** Set of unique non-transfer categories (raw names) used in this import. */
  uniqueCategories: string[];
  /** Set of unique wallet names used in this import. */
  uniqueWallets: string[];
  /** Rows that couldn't be parsed — kept for debugging / display. */
  errors: { row: number; reason: string; raw?: Record<string, string> }[];
}

const TRANSFER_OUT = "outgoing transfer";
const TRANSFER_IN = "incoming transfer";

function ddmmyyyyToIso(s: string): string | null {
  // Money Lover uses DD/MM/YYYY. Be lenient about leading zeros.
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  // Strip any non-numeric except minus and dot
  const cleaned = String(s).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_]+/g, "");
}

export async function parseMoneyLoverCsv(file: File): Promise<ParseResult> {
  const text = await file.text();

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const errors: ParseResult["errors"] = [];
  const rows: RawMoneyLoverRow[] = [];

  parsed.data.forEach((rec, idx) => {
    // Build a normalized key map: ignore case + spaces
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(rec)) {
      norm[normalizeKey(k)] = (v ?? "").trim();
    }

    const date = norm["date"] || "";
    const category = norm["category"] || "";
    const amountStr = norm["amount"] ?? "";
    const wallet = norm["wallet"] || "";

    if (!date || !category || !amountStr || !wallet) {
      errors.push({
        row: idx + 2, // +1 for header, +1 for human-friendly 1-based
        reason: "Missing required field (date, category, amount, or wallet).",
        raw: rec,
      });
      return;
    }

    const iso = ddmmyyyyToIso(date);
    if (!iso) {
      errors.push({ row: idx + 2, reason: `Bad date format: "${date}".`, raw: rec });
      return;
    }

    const amount = parseAmount(amountStr);
    if (amount === 0) {
      errors.push({ row: idx + 2, reason: "Zero amount — skipped.", raw: rec });
      return;
    }

    rows.push({
      id: norm["id"] || String(idx),
      date: iso,
      category: category.trim(),
      amount,
      currency: norm["currency"] || "IDR",
      wallet: wallet.trim(),
      note: norm["note"] || "",
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Pair up Outgoing/Incoming transfers
  // ──────────────────────────────────────────────────────────────────────────
  const outgoings: RawMoneyLoverRow[] = [];
  const incomings: RawMoneyLoverRow[] = [];
  const others: RawMoneyLoverRow[] = [];

  for (const r of rows) {
    const cat = r.category.toLowerCase();
    if (cat === TRANSFER_OUT) outgoings.push(r);
    else if (cat === TRANSFER_IN) incomings.push(r);
    else others.push(r);
  }

  const usedIncomingIds = new Set<string>();
  const transferPairs: { out: RawMoneyLoverRow; inc: RawMoneyLoverRow }[] = [];

  for (const out of outgoings) {
    const absOut = Math.abs(out.amount);
    const match = incomings.find(
      (inc) =>
        !usedIncomingIds.has(inc.id) &&
        inc.date === out.date &&
        Math.abs(inc.amount) === absOut &&
        inc.wallet.toLowerCase() !== out.wallet.toLowerCase(),
    );
    if (match) {
      usedIncomingIds.add(match.id);
      transferPairs.push({ out, inc: match });
    }
  }

  const orphanOutgoings = outgoings.filter(
    (o) => !transferPairs.some((p) => p.out.id === o.id),
  );
  const orphanIncomings = incomings.filter((i) => !usedIncomingIds.has(i.id));

  // Build normalized list
  const normalized: NormalizedTx[] = [];

  for (const { out, inc } of transferPairs) {
    normalized.push({
      kind: "transfer",
      date: out.date,
      amount: Math.abs(out.amount),
      category: "Transfer", // internal marker, not user-pickable
      wallet: out.wallet,
      toWallet: inc.wallet,
      description: out.note || inc.note || `Transfer ${out.wallet} → ${inc.wallet}`,
    });
  }

  for (const r of others) {
    normalized.push({
      kind: r.amount < 0 ? "expense" : "income",
      date: r.date,
      amount: Math.abs(r.amount),
      category: r.category,
      wallet: r.wallet,
      description: r.note,
    });
  }

  // Orphans are treated as best-effort: outgoing → expense, incoming → income.
  for (const o of orphanOutgoings) {
    normalized.push({
      kind: "expense",
      date: o.date,
      amount: Math.abs(o.amount),
      category: "Transfer (orphan)",
      wallet: o.wallet,
      description: o.note || "Unmatched outgoing transfer",
    });
  }
  for (const i of orphanIncomings) {
    normalized.push({
      kind: "income",
      date: i.date,
      amount: Math.abs(i.amount),
      category: "Transfer (orphan)",
      wallet: i.wallet,
      description: i.note || "Unmatched incoming transfer",
    });
  }

  // Sort by date ascending so wallet balances accumulate naturally.
  normalized.sort((a, b) => a.date.localeCompare(b.date));

  // ──────────────────────────────────────────────────────────────────────────
  // Build unique lists for the mapping UI
  // ──────────────────────────────────────────────────────────────────────────
  const catSet = new Set<string>();
  const walletSet = new Set<string>();

  for (const n of normalized) {
    if (n.kind !== "transfer") catSet.add(n.category);
    walletSet.add(n.wallet);
    if (n.toWallet) walletSet.add(n.toWallet);
  }

  return {
    rows,
    normalized,
    uniqueCategories: Array.from(catSet).sort(),
    uniqueWallets: Array.from(walletSet).sort(),
    errors,
  };
}

/**
 * Default mapping suggestion: try to auto-match Money Lover category names to
 * our English defaults. Returns "" when no confident match — UI will then ask
 * the user to pick.
 */
export const MONEY_LOVER_CATEGORY_HINTS: Record<string, string> = {
  "food & beverage": "Food & Drinks",
  "food and beverage": "Food & Drinks",
  "transportation": "Transportation",
  "rentals": "Rent",
  "rent": "Rent",
  "water bill": "Water Bill",
  "phone bill": "Phone & Mobile",
  "electricity bill": "Electricity Bill",
  "internet bill": "Internet Bill",
  "other utility bills": "Other Bills",
  "home maintenance": "Home Maintenance",
  "vehicle maintenance": "Vehicle Maintenance",
  "healthcare": "Healthcare",
  "insurances": "Insurance",
  "insurance": "Insurance",
  "education": "Education",
  "houseware": "Furniture",
  "personal items": "Clothing & Accessories",
  "pets": "Pets",
  "home services": "Household Help",
  "other expense": "Other Expense",
  "fitness": "Fitness",
  "makeup": "Cosmetics",
  "gifts & donations": "Gifts & Donations",
  "gifts and donations": "Gifts & Donations",
  "streaming service": "App Subscriptions",
  "subscribe app": "App Subscriptions",
  "games": "Games",
  "investment": "Investment",
  "pay interest": "Pay Interest",
  "shopping": "Shopping",
  "laundry": "Laundry",
  "parking": "Parking",
  "petrol": "Fuel",
  "fuel": "Fuel",
  "family": "Family",
  "bpjs": "BPJS",
  "lost": "Other Expense",
  "admin fee": "Admin Fees",
  "security": "Security",
  "concert": "Entertainment",
  "haircut": "Haircut",
  "entertainment": "Entertainment",
  "collect interest": "Interest Income",
  "interest received": "Interest Income",
  "salary": "Salary",
  "other income": "Other Income",
  "angpau": "Angpau",
  "reimburse": "Reimbursement",
  "reimbursement": "Reimbursement",
  "bonus": "Bonus",
  "debt collection": "Other Income",
  "debt": "Pay Debt",
  "loan": "Loan Received",
  "repayment": "Pay Debt",
};

export function suggestCategory(rawName: string): string | null {
  const hit = MONEY_LOVER_CATEGORY_HINTS[rawName.toLowerCase().trim()];
  return hit || null;
}
