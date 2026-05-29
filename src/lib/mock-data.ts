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
 * Default category set, modeled after Money Lover's catalogue.
 * Money Lover's distinct Debt/Loan group is mapped into income/expense since
 * CallFin only has two transaction types.
 */
export const DEFAULT_CATEGORIES: Omit<Category, "id" | "user_id">[] = [
  // ─── Income ────────────────────────────────────────────────────────────────
  { name: "Gaji",                type: "income", color: "bg-emerald-100 text-emerald-700", icon: "💼", isDefault: true },
  { name: "Bonus",               type: "income", color: "bg-green-100 text-green-700",     icon: "🎁", isDefault: true },
  { name: "Freelance",           type: "income", color: "bg-cyan-100 text-cyan-700",       icon: "💻", isDefault: true },
  { name: "Bunga Diterima",      type: "income", color: "bg-amber-100 text-amber-700",     icon: "💸", isDefault: true },
  { name: "Reimburse",           type: "income", color: "bg-teal-100 text-teal-700",       icon: "🔄", isDefault: true },
  { name: "Angpau",              type: "income", color: "bg-red-100 text-red-700",         icon: "🧧", isDefault: true },
  { name: "Pinjaman Diterima",   type: "income", color: "bg-blue-100 text-blue-700",       icon: "🏦", isDefault: true },
  { name: "Tagihan Terbayar",    type: "income", color: "bg-violet-100 text-violet-700",   icon: "💰", isDefault: true },
  { name: "Pemasukan Lainnya",   type: "income", color: "bg-gray-100 text-gray-700",       icon: "📥", isDefault: true },

  // ─── Expense — daily essentials ────────────────────────────────────────────
  { name: "Makanan & Minuman",   type: "expense", color: "bg-orange-100 text-orange-700",  icon: "🍔", isDefault: true },
  { name: "Transportasi",        type: "expense", color: "bg-blue-100 text-blue-700",      icon: "🚗", isDefault: true },
  { name: "Bensin",              type: "expense", color: "bg-amber-100 text-amber-700",    icon: "⛽", isDefault: true },
  { name: "Parkir",              type: "expense", color: "bg-yellow-100 text-yellow-700",  icon: "🅿️", isDefault: true },
  { name: "Belanja",             type: "expense", color: "bg-pink-100 text-pink-700",      icon: "🛍️", isDefault: true },
  { name: "Barang Pribadi",      type: "expense", color: "bg-rose-100 text-rose-700",      icon: "👕", isDefault: true },

  // ─── Expense — bills & utilities ───────────────────────────────────────────
  { name: "Sewa",                type: "expense", color: "bg-stone-100 text-stone-700",    icon: "🏠", isDefault: true },
  { name: "Tagihan Air",         type: "expense", color: "bg-sky-100 text-sky-700",        icon: "💧", isDefault: true },
  { name: "Tagihan Listrik",     type: "expense", color: "bg-yellow-100 text-yellow-700",  icon: "⚡", isDefault: true },
  { name: "Tagihan Internet",    type: "expense", color: "bg-cyan-100 text-cyan-700",      icon: "🌐", isDefault: true },
  { name: "Pulsa & Telepon",     type: "expense", color: "bg-blue-100 text-blue-700",      icon: "📞", isDefault: true },
  { name: "Tagihan Lainnya",     type: "expense", color: "bg-red-100 text-red-700",        icon: "📄", isDefault: true },
  { name: "BPJS",                type: "expense", color: "bg-emerald-100 text-emerald-700",icon: "🏛️", isDefault: true },
  { name: "Asuransi",            type: "expense", color: "bg-teal-100 text-teal-700",      icon: "🛡️", isDefault: true },
  { name: "Aplikasi Berlangganan",type: "expense",color: "bg-indigo-100 text-indigo-700",  icon: "📱", isDefault: true },
  { name: "Streaming",           type: "expense", color: "bg-purple-100 text-purple-700",  icon: "📺", isDefault: true },
  { name: "Biaya Admin",         type: "expense", color: "bg-slate-100 text-slate-700",    icon: "🧾", isDefault: true },

  // ─── Expense — home & vehicle ──────────────────────────────────────────────
  { name: "Perawatan Rumah",     type: "expense", color: "bg-amber-100 text-amber-700",    icon: "🔧", isDefault: true },
  { name: "Perawatan Kendaraan", type: "expense", color: "bg-zinc-100 text-zinc-700",      icon: "🚙", isDefault: true },
  { name: "Perabotan",           type: "expense", color: "bg-stone-100 text-stone-700",    icon: "🛋️", isDefault: true },
  { name: "Layanan Rumah",       type: "expense", color: "bg-teal-100 text-teal-700",      icon: "🧹", isDefault: true },
  { name: "Laundry",             type: "expense", color: "bg-sky-100 text-sky-700",        icon: "🧺", isDefault: true },
  { name: "Keamanan",            type: "expense", color: "bg-neutral-100 text-neutral-700",icon: "🔒", isDefault: true },

  // ─── Expense — health, family, personal ────────────────────────────────────
  { name: "Kesehatan",           type: "expense", color: "bg-green-100 text-green-700",    icon: "🏥", isDefault: true },
  { name: "Kebugaran",           type: "expense", color: "bg-lime-100 text-lime-700",      icon: "🏋️", isDefault: true },
  { name: "Kosmetik",            type: "expense", color: "bg-pink-100 text-pink-700",      icon: "💄", isDefault: true },
  { name: "Potong Rambut",       type: "expense", color: "bg-orange-100 text-orange-700",  icon: "✂️", isDefault: true },
  { name: "Pendidikan",          type: "expense", color: "bg-blue-100 text-blue-700",      icon: "📚", isDefault: true },
  { name: "Keluarga",            type: "expense", color: "bg-rose-100 text-rose-700",      icon: "👨‍👩‍👧", isDefault: true },
  { name: "Hewan Peliharaan",    type: "expense", color: "bg-yellow-100 text-yellow-700",  icon: "🐶", isDefault: true },
  { name: "Hadiah & Donasi",     type: "expense", color: "bg-fuchsia-100 text-fuchsia-700",icon: "🎁", isDefault: true },

  // ─── Expense — entertainment ───────────────────────────────────────────────
  { name: "Hiburan",             type: "expense", color: "bg-purple-100 text-purple-700",  icon: "🎬", isDefault: true },
  { name: "Konser",              type: "expense", color: "bg-violet-100 text-violet-700",  icon: "🎤", isDefault: true },
  { name: "Game",                type: "expense", color: "bg-indigo-100 text-indigo-700",  icon: "🎮", isDefault: true },

  // ─── Expense — finance ─────────────────────────────────────────────────────
  { name: "Investasi",           type: "expense", color: "bg-emerald-100 text-emerald-700",icon: "📈", isDefault: true },
  { name: "Bayar Bunga",         type: "expense", color: "bg-amber-100 text-amber-700",    icon: "💸", isDefault: true },
  { name: "Bayar Hutang",        type: "expense", color: "bg-red-100 text-red-700",        icon: "💳", isDefault: true },
  { name: "Cicilan",             type: "expense", color: "bg-orange-100 text-orange-700",  icon: "📆", isDefault: true },

  // ─── Expense — misc ────────────────────────────────────────────────────────
  { name: "Hilang",              type: "expense", color: "bg-neutral-100 text-neutral-700",icon: "❌", isDefault: true },
  { name: "Pengeluaran Lainnya", type: "expense", color: "bg-gray-100 text-gray-700",      icon: "📌", isDefault: true },

  // ─── Internal — used by Goal contributions, hidden from manual pickers ─────
  { name: "Tabungan",            type: "expense", color: "bg-violet-100 text-violet-700",  icon: "🐷", isDefault: true, isInternal: true },
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
