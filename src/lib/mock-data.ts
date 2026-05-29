import { Transaction, Budget, Goal, MonthlyData, Wallet, Category } from "@/types";

export const mockWallets: Wallet[] = [
  { id: "w1", user_id: "u1", name: "Tunai", type: "cash", balance: 1500000, color: "bg-emerald-500", icon: "💵" },
  { id: "w2", user_id: "u1", name: "BCA", type: "bank", balance: 12000000, color: "bg-blue-600", icon: "🏦" },
  { id: "w3", user_id: "u1", name: "GoPay", type: "ewallet", balance: 350000, color: "bg-sky-500", icon: "📱" },
  { id: "w4", user_id: "u1", name: "Kartu Kredit", type: "credit", balance: -2100000, color: "bg-rose-500", icon: "💳" },
];

export const mockTransactions: Transaction[] = [
  { id: "1", user_id: "u1", wallet_id: "w2", type: "income", amount: 10000000, category: "Gaji", description: "Gaji bulan ini", date: "2026-05-01" },
  { id: "2", user_id: "u1", wallet_id: "w2", type: "expense", amount: 500000, category: "Tagihan", description: "Bayar listrik", date: "2026-05-01" },
  { id: "3", user_id: "u1", wallet_id: "w3", type: "expense", amount: 50000, category: "Makanan", description: "Makan siang", date: "2026-05-02" },
  { id: "4", user_id: "u1", wallet_id: "w1", type: "expense", amount: 30000, category: "Makanan", description: "Kopi pagi", date: "2026-05-03" },
  { id: "5", user_id: "u1", wallet_id: "w1", type: "expense", amount: 200000, category: "Transportasi", description: "Bensin", date: "2026-05-05" },
  { id: "6", user_id: "u1", wallet_id: "w2", type: "income", amount: 500000, category: "Freelance", description: "Proyek desain", date: "2026-05-07" },
  { id: "7", user_id: "u1", wallet_id: "w4", type: "expense", amount: 350000, category: "Hiburan", description: "Nonton bioskop + makan", date: "2026-05-10" },
  { id: "8", user_id: "u1", wallet_id: "w4", type: "expense", amount: 1200000, category: "Belanja", description: "Belanja bulanan", date: "2026-05-12" },
  { id: "9", user_id: "u1", wallet_id: "w3", type: "expense", amount: 75000, category: "Makanan", description: "Dinner", date: "2026-05-14" },
  { id: "10", user_id: "u1", wallet_id: "w2", type: "expense", amount: 450000, category: "Tagihan", description: "Bayar internet", date: "2026-05-15" },
];

export const mockBudgets: Budget[] = [
  { id: "b1", user_id: "u1", category: "Makanan", limit_amount: 1500000, month_year: "2026-05", spent: 155000 },
  { id: "b2", user_id: "u1", category: "Transportasi", limit_amount: 500000, month_year: "2026-05", spent: 200000 },
  { id: "b3", user_id: "u1", category: "Hiburan", limit_amount: 500000, month_year: "2026-05", spent: 350000 },
  { id: "b4", user_id: "u1", category: "Tagihan", limit_amount: 1000000, month_year: "2026-05", spent: 950000 },
  { id: "b5", user_id: "u1", category: "Belanja", limit_amount: 1500000, month_year: "2026-05", spent: 1200000 },
];

export const mockGoals: Goal[] = [
  { id: "g1", user_id: "u1", goal_name: "Dana Darurat", target_amount: 30000000, current_amount: 12000000, deadline: "2026-12-31" },
  { id: "g2", user_id: "u1", goal_name: "Liburan Bali", target_amount: 5000000, current_amount: 2500000, deadline: "2026-08-01" },
  { id: "g3", user_id: "u1", goal_name: "Laptop Baru", target_amount: 15000000, current_amount: 3000000, deadline: "2026-10-01" },
];

export const mockMonthlyData: MonthlyData[] = [
  { month: "Des", income: 10000000, expense: 7200000 },
  { month: "Jan", income: 10500000, expense: 6800000 },
  { month: "Feb", income: 10000000, expense: 8100000 },
  { month: "Mar", income: 11000000, expense: 7500000 },
  { month: "Apr", income: 10000000, expense: 6900000 },
  { month: "Mei", income: 10500000, expense: 2960000 },
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
