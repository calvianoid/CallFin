import { Transaction, Budget, Goal, MonthlyData, Wallet, Category } from "@/types";

/**
 * Demo persona — "Andi", a ~28 y/o software engineer in Jakarta.
 * Take-home ~Rp 18jt/mo + occasional freelance, spends ~Rp 11jt/mo, and has
 * been investing for a few years (bulk of net worth sits in the "Investasi"
 * wallet). 12 months of history make the Reports & Financial Freedom pages
 * compute realistic annual figures.
 */
export const mockWallets: Wallet[] = [
  { id: "w1", user_id: "u1", name: "Tunai", type: "cash", balance: 1500000, color: "bg-emerald-500", icon: "💵" },
  { id: "w2", user_id: "u1", name: "BCA", type: "bank", balance: 47000000, color: "bg-blue-600", icon: "🏦" },
  { id: "w5", user_id: "u1", name: "Investasi", type: "bank", balance: 215000000, color: "bg-violet-500", icon: "📈" },
  { id: "w3", user_id: "u1", name: "GoPay", type: "ewallet", balance: 800000, color: "bg-sky-500", icon: "📱" },
  { id: "w4", user_id: "u1", name: "Kartu Kredit", type: "credit", balance: -3200000, color: "bg-rose-500", icon: "💳" },
];

// 12 months ending at the current month (today ≈ 2026-05).
const PERSONA_MONTHS = [
  "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11",
  "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05",
];

/** Deterministic ±swing variation around a base (rounded to nearest 1k). */
function vary(base: number, seed: number, swing: number): number {
  const f = Math.sin(seed * 1.7 + 0.5); // -1..1, stable across renders
  return Math.round((base + f * swing) / 1000) * 1000;
}

function buildMockTransactions(): Transaction[] {
  const out: Transaction[] = [];
  let n = 1;
  const push = (
    wallet_id: string,
    type: Transaction["type"],
    amount: number,
    category: string,
    description: string,
    day: number,
    ym: string,
  ) => {
    out.push({
      id: String(n++),
      user_id: "u1",
      wallet_id,
      type,
      amount,
      category,
      description,
      date: `${ym}-${String(day).padStart(2, "0")}`,
    });
  };

  PERSONA_MONTHS.forEach((ym, i) => {
    // ── Income ───────────────────────────────────────────────────────────
    push("w2", "income", 18000000, "Salary", "Gaji bulanan", 25, ym);
    if (i % 3 === 0) {
      push("w2", "income", vary(3000000, i, 800000), "Freelance", "Proyek sampingan", 15, ym);
    }
    if (ym === "2025-12") {
      push("w2", "income", 18000000, "Bonus", "Bonus akhir tahun", 20, ym); // THR/bonus
    }

    // ── Fixed bills ──────────────────────────────────────────────────────
    push("w2", "expense", 3500000, "Rent", "Sewa apartemen", 2, ym);
    push("w2", "expense", vary(420000, i, 80000), "Electricity Bill", "Token listrik", 5, ym);
    push("w2", "expense", 150000, "Water Bill", "Tagihan air", 5, ym);
    push("w2", "expense", 350000, "Internet Bill", "WiFi rumah", 8, ym);
    push("w3", "expense", 100000, "Phone & Mobile", "Pulsa & paket data", 8, ym);
    push("w2", "expense", 185000, "App Subscriptions", "Netflix, Spotify, iCloud", 10, ym);

    // ── Food & Drinks (~Rp 2,8jt/bln) ────────────────────────────────────
    push("w2", "expense", vary(750000, i, 100000), "Food & Drinks", "Belanja groceries", 4, ym);
    push("w2", "expense", vary(700000, i + 1, 100000), "Food & Drinks", "Belanja groceries", 18, ym);
    push("w3", "expense", vary(450000, i + 2, 120000), "Food & Drinks", "Makan di luar", 9, ym);
    push("w4", "expense", vary(520000, i + 3, 150000), "Food & Drinks", "Nongkrong akhir pekan", 23, ym);
    push("w1", "expense", vary(380000, i + 4, 80000), "Food & Drinks", "Kopi & cemilan", 14, ym);

    // ── Transport ────────────────────────────────────────────────────────
    push("w3", "expense", vary(600000, i, 120000), "Transportation", "Ojek & taksi online", 12, ym);
    push("w1", "expense", vary(400000, i + 2, 80000), "Fuel", "Bensin motor", 6, ym);

    // ── Lifestyle (varies by month) ──────────────────────────────────────
    push("w4", "expense", vary(900000, i, 500000), "Shopping", "Belanja online", 17, ym);
    push("w4", "expense", vary(420000, i + 1, 150000), "Entertainment", "Nonton & game", 20, ym);
    push("w2", "expense", 400000, "Fitness", "Membership gym", 3, ym);

    // ── Occasional one-offs — bikin tiap bulan beda ──────────────────────
    if (i === 2) push("w2", "expense", 1200000, "Vehicle Maintenance", "Servis & ganti oli", 11, ym);
    if (i === 5) push("w2", "expense", 1500000, "Healthcare", "Cek kesehatan & obat", 13, ym);
    if (ym === "2025-12") {
      push("w4", "expense", 2000000, "Gifts & Donations", "Kado & donasi akhir tahun", 22, ym);
      push("w4", "expense", 1500000, "Shopping", "Belanja liburan", 27, ym);
    }
    if (i === 8) push("w4", "expense", 1400000, "Clothing & Accessories", "Beli baju kerja", 16, ym);
    if (i === 10) push("w2", "expense", 2500000, "Education", "Kursus online & buku", 19, ym);
  });

  // Newest first, to match how the app sorts.
  return out.reverse();
}

export const mockTransactions: Transaction[] = buildMockTransactions();

export const mockBudgets: Budget[] = [
  { id: "b1", user_id: "u1", category: "Food & Drinks", limit_amount: 3500000, month_year: "2026-05", spent: 0 },
  { id: "b2", user_id: "u1", category: "Transportation", limit_amount: 1200000, month_year: "2026-05", spent: 0 },
  { id: "b3", user_id: "u1", category: "Entertainment", limit_amount: 700000, month_year: "2026-05", spent: 0 },
  { id: "b4", user_id: "u1", category: "Shopping", limit_amount: 1500000, month_year: "2026-05", spent: 0 },
  { id: "b5", user_id: "u1", category: "Rent", limit_amount: 3500000, month_year: "2026-05", spent: 0 },
];

export const mockGoals: Goal[] = [
  { id: "g1", user_id: "u1", goal_name: "Dana Darurat", target_amount: 66000000, current_amount: 45000000, deadline: "2026-12-31" },
  { id: "g2", user_id: "u1", goal_name: "DP Rumah", target_amount: 300000000, current_amount: 85000000, deadline: "2028-06-01" },
  { id: "g3", user_id: "u1", goal_name: "Liburan Jepang", target_amount: 35000000, current_amount: 12000000, deadline: "2026-11-01" },
];

export const mockMonthlyData: MonthlyData[] = [
  { month: "Des", income: 36000000, expense: 13800000 },
  { month: "Jan", income: 18000000, expense: 10400000 },
  { month: "Feb", income: 18000000, expense: 11900000 },
  { month: "Mar", income: 21000000, expense: 10800000 },
  { month: "Apr", income: 18000000, expense: 12500000 },
  { month: "Mei", income: 18000000, expense: 10600000 },
];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const CATEGORY_COLOR_OPTIONS = [
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-red-100 text-red-700",
  "bg-pink-100 text-pink-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
  "bg-emerald-100 text-emerald-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
];

/**
 * Default category set in English, inspired by Money Lover.
 * Removed redundant entries (Streaming → folded into App Subscriptions,
 * Concert/Lost → Entertainment & Other Expense, Cicilan → Pay Debt,
 * Tagihan Terbayar removed as ambiguous).
 */
export const DEFAULT_CATEGORIES: Omit<Category, "id" | "user_id">[] = [
  // ─── Income (8) ────────────────────────────────────────────────────────────
  { name: "Salary",              type: "income", color: "bg-emerald-100 text-emerald-700", icon: "💼", isDefault: true },
  { name: "Bonus",               type: "income", color: "bg-green-100 text-green-700",     icon: "🎁", isDefault: true },
  { name: "Freelance",           type: "income", color: "bg-cyan-100 text-cyan-700",       icon: "💻", isDefault: true },
  { name: "Interest Income",     type: "income", color: "bg-amber-100 text-amber-700",     icon: "💸", isDefault: true },
  { name: "Reimbursement",       type: "income", color: "bg-teal-100 text-teal-700",       icon: "🔄", isDefault: true },
  { name: "Angpau",              type: "income", color: "bg-red-100 text-red-700",         icon: "🧧", isDefault: true },
  { name: "Loan Received",       type: "income", color: "bg-blue-100 text-blue-700",       icon: "🏦", isDefault: true },
  { name: "Other Income",        type: "income", color: "bg-gray-100 text-gray-700",       icon: "📥", isDefault: true },

  // ─── Expense — daily (6) ───────────────────────────────────────────────────
  { name: "Food & Drinks",       type: "expense", color: "bg-orange-100 text-orange-700",  icon: "🍔", isDefault: true },
  { name: "Transportation",      type: "expense", color: "bg-blue-100 text-blue-700",      icon: "🚗", isDefault: true },
  { name: "Fuel",                type: "expense", color: "bg-amber-100 text-amber-700",    icon: "⛽", isDefault: true },
  { name: "Parking",             type: "expense", color: "bg-yellow-100 text-yellow-700",  icon: "🅿️", isDefault: true },
  { name: "Shopping",            type: "expense", color: "bg-pink-100 text-pink-700",      icon: "🛍️", isDefault: true },
  { name: "Clothing & Accessories",type: "expense", color: "bg-rose-100 text-rose-700",    icon: "👕", isDefault: true },

  // ─── Expense — bills & utilities (10) ──────────────────────────────────────
  { name: "Rent",                type: "expense", color: "bg-stone-100 text-stone-700",    icon: "🏠", isDefault: true },
  { name: "Water Bill",          type: "expense", color: "bg-sky-100 text-sky-700",        icon: "💧", isDefault: true },
  { name: "Electricity Bill",    type: "expense", color: "bg-yellow-100 text-yellow-700",  icon: "⚡", isDefault: true },
  { name: "Internet Bill",       type: "expense", color: "bg-cyan-100 text-cyan-700",      icon: "🌐", isDefault: true },
  { name: "Phone & Mobile",      type: "expense", color: "bg-blue-100 text-blue-700",      icon: "📞", isDefault: true },
  { name: "Other Bills",         type: "expense", color: "bg-red-100 text-red-700",        icon: "📄", isDefault: true },
  { name: "BPJS",                type: "expense", color: "bg-emerald-100 text-emerald-700",icon: "🏛️", isDefault: true },
  { name: "Insurance",           type: "expense", color: "bg-teal-100 text-teal-700",      icon: "🛡️", isDefault: true },
  { name: "App Subscriptions",   type: "expense", color: "bg-indigo-100 text-indigo-700",  icon: "📱", isDefault: true },
  { name: "Admin Fees",          type: "expense", color: "bg-slate-100 text-slate-700",    icon: "🧾", isDefault: true },

  // ─── Expense — home & vehicle (6) ──────────────────────────────────────────
  { name: "Home Maintenance",    type: "expense", color: "bg-amber-100 text-amber-700",    icon: "🔧", isDefault: true },
  { name: "Vehicle Maintenance", type: "expense", color: "bg-zinc-100 text-zinc-700",      icon: "🚙", isDefault: true },
  { name: "Furniture",           type: "expense", color: "bg-stone-100 text-stone-700",    icon: "🛋️", isDefault: true },
  { name: "Household Help",      type: "expense", color: "bg-teal-100 text-teal-700",      icon: "🧹", isDefault: true },
  { name: "Laundry",             type: "expense", color: "bg-sky-100 text-sky-700",        icon: "🧺", isDefault: true },
  { name: "Security",            type: "expense", color: "bg-neutral-100 text-neutral-700",icon: "🔒", isDefault: true },

  // ─── Expense — health, family, personal (8) ────────────────────────────────
  { name: "Healthcare",          type: "expense", color: "bg-green-100 text-green-700",    icon: "🏥", isDefault: true },
  { name: "Fitness",             type: "expense", color: "bg-lime-100 text-lime-700",      icon: "🏋️", isDefault: true },
  { name: "Cosmetics",           type: "expense", color: "bg-pink-100 text-pink-700",      icon: "💄", isDefault: true },
  { name: "Haircut",             type: "expense", color: "bg-orange-100 text-orange-700",  icon: "✂️", isDefault: true },
  { name: "Education",           type: "expense", color: "bg-blue-100 text-blue-700",      icon: "📚", isDefault: true },
  { name: "Family",              type: "expense", color: "bg-rose-100 text-rose-700",      icon: "👨‍👩‍👧", isDefault: true },
  { name: "Pets",                type: "expense", color: "bg-yellow-100 text-yellow-700",  icon: "🐶", isDefault: true },
  { name: "Gifts & Donations",   type: "expense", color: "bg-fuchsia-100 text-fuchsia-700",icon: "🎁", isDefault: true },

  // ─── Expense — entertainment (2) ───────────────────────────────────────────
  { name: "Entertainment",       type: "expense", color: "bg-purple-100 text-purple-700",  icon: "🎬", isDefault: true },
  { name: "Games",               type: "expense", color: "bg-indigo-100 text-indigo-700",  icon: "🎮", isDefault: true },

  // ─── Expense — finance (3) ─────────────────────────────────────────────────
  { name: "Investment",          type: "expense", color: "bg-emerald-100 text-emerald-700",icon: "📈", isDefault: true },
  { name: "Pay Interest",        type: "expense", color: "bg-amber-100 text-amber-700",    icon: "💸", isDefault: true },
  { name: "Pay Debt",            type: "expense", color: "bg-red-100 text-red-700",        icon: "💳", isDefault: true },

  // ─── Expense — misc (1) ────────────────────────────────────────────────────
  { name: "Other Expense",       type: "expense", color: "bg-gray-100 text-gray-700",      icon: "📌", isDefault: true },

  // ─── Internal — used by Goal contributions, hidden from manual pickers ─────
  { name: "Savings",             type: "expense", color: "bg-violet-100 text-violet-700",  icon: "🐷", isDefault: true, isInternal: true },
];

/** Look up a category's color + icon by name from a list of categories. Falls back to gray. */
export function getCategoryStyle(name: string, categories: Category[]): { color: string; icon?: string } {
  const c = categories.find((x) => x.name === name);
  if (c) return { color: c.color, icon: c.icon };
  return { color: "bg-gray-100 text-gray-700" };
}

/** @deprecated Prefer getCategoryStyle with store categories. Kept for components not yet migrated. */
export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.name, c.color])
);

/** @deprecated Prefer reading from store categories. */
export const CATEGORIES = DEFAULT_CATEGORIES.filter((c) => !c.isInternal).map((c) => c.name);

export const WALLET_TYPE_LABEL: Record<string, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
};
