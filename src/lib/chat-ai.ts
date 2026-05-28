import { Transaction, Budget, Goal, Wallet, ParsedTransaction } from "@/types";
import { formatRupiah } from "./mock-data";

export interface ParsedGoalContribution {
  kind: "goal_contribution";
  goal_id: string;
  goal_name: string;
  amount: number;
  wallet_id: string;
}

export interface ParsedTransfer {
  kind: "transfer";
  from_wallet_id: string;
  to_wallet_id: string;
  from_name: string;
  to_name: string;
  amount: number;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MONTHS_ID: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maret: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, agu: 8, agt: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12,
};

const QUESTION_WORDS = /^(berapa|apakah|gimana|bagaimana|kapan|dimana|kenapa|mengapa|siapa|apa|tunjukkan|cek|lihat|tampilkan|show|how|what|when|where|why|cari|tolong|coba|bisa)\b/i;
const CONTAINS_QUESTION_HINT = /(berapa|apakah|gimana|bagaimana|kapan|dimana|kenapa|mengapa|tunjukkan|tampilkan|lihat|cek)\s|\?/i;

export function isQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (QUESTION_WORDS.test(t)) return true;
  if (t.endsWith("?")) return true;
  if (CONTAINS_QUESTION_HINT.test(t)) return true;
  return false;
}

interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseDateRange(text: string, now = new Date()): DateRange | null {
  const lower = text.toLowerCase();

  if (/\bhari\s*ini\b/.test(lower)) {
    return { from: startOfDay(now), to: endOfDay(now), label: "hari ini" };
  }
  if (/\bkemarin\b/.test(lower)) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), label: "kemarin" };
  }
  if (/\bminggu\s*ini\b/.test(lower)) {
    const day = now.getDay(); // 0 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return { from: startOfDay(monday), to: endOfDay(now), label: "minggu ini" };
  }
  if (/\bbulan\s*lalu\b/.test(lower)) {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { from, to, label: "bulan lalu" };
  }
  if (/\bbulan\s*ini\b/.test(lower)) {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: endOfDay(now), label: "bulan ini" };
  }
  if (/\btahun\s*ini\b/.test(lower)) {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from, to: endOfDay(now), label: "tahun ini" };
  }

  // "tanggal 15 mei" / "15 mei" / "15/5" / "15-5-2026"
  const dmyMatch = lower.match(/(\d{1,2})[\s/-](\d{1,2}|[a-z]+)(?:[\s/-](\d{2,4}))?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    let month: number;
    if (/^\d+$/.test(dmyMatch[2])) month = parseInt(dmyMatch[2]);
    else month = MONTHS_ID[dmyMatch[2]] || 0;
    const year = dmyMatch[3] ? (dmyMatch[3].length === 2 ? 2000 + parseInt(dmyMatch[3]) : parseInt(dmyMatch[3])) : now.getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day);
      return { from: startOfDay(d), to: endOfDay(d), label: `${day} ${MONTH_NAMES[month - 1]}` };
    }
  }

  // "bulan mei" / "mei"
  const monthMatch = lower.match(/\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|sep|okt|nov|des)\b/);
  if (monthMatch) {
    const month = MONTHS_ID[monthMatch[1]];
    const from = new Date(now.getFullYear(), month - 1, 1);
    const to = new Date(now.getFullYear(), month, 0, 23, 59, 59);
    return { from, to, label: `bulan ${monthMatch[1]}` };
  }

  return null;
}

function inRange(dateStr: string, range: DateRange): boolean {
  const d = new Date(dateStr);
  return d >= range.from && d <= range.to;
}

interface AnswerContext {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  goals: Goal[];
}

export function answerQuery(text: string, ctx: AnswerContext): string {
  const lower = text.toLowerCase();
  const { transactions, wallets, budgets, goals } = ctx;
  const range = parseDateRange(text);

  // Saldo per dompet / total
  if (/\bsaldo\b/.test(lower)) {
    if (/total|semua|all/.test(lower)) {
      const total = wallets.reduce((s, w) => s + w.balance, 0);
      const list = wallets.map((w) => `${w.icon} ${w.name}: ${formatRupiah(w.balance)}`).join("\n");
      return `💰 **Total saldo semua dompet:** ${formatRupiah(total)}\n\n${list}`;
    }
    const wallet = wallets.find((w) => lower.includes(w.name.toLowerCase()));
    if (wallet) {
      return `${wallet.icon} **Saldo ${wallet.name}:** ${formatRupiah(wallet.balance)}`;
    }
    const total = wallets.reduce((s, w) => s + w.balance, 0);
    return `💰 **Total saldo:** ${formatRupiah(total)}\n\n` +
      wallets.map((w) => `• ${w.icon} ${w.name}: ${formatRupiah(w.balance)}`).join("\n");
  }

  // Budget
  if (/\bbudget|anggaran\b/.test(lower)) {
    if (budgets.length === 0) return "Belum ada budget yang diatur. Kamu bisa tambah lewat halaman /budgets ya!";
    const cat = budgets.find((b) => lower.includes(b.category.toLowerCase()));
    if (cat) {
      const pct = ((cat.spent || 0) / cat.limit_amount) * 100;
      const sisa = cat.limit_amount - (cat.spent || 0);
      const status = pct >= 95 ? "🔴 hampir habis!" : pct >= 80 ? "🟡 waspada" : "🟢 aman";
      return `📊 **Budget ${cat.category}:**\nTerpakai: ${formatRupiah(cat.spent || 0)} dari ${formatRupiah(cat.limit_amount)} (${pct.toFixed(0)}%)\nSisa: ${formatRupiah(sisa)}\nStatus: ${status}`;
    }
    const list = budgets.map((b) => {
      const pct = ((b.spent || 0) / b.limit_amount) * 100;
      const emoji = pct >= 95 ? "🔴" : pct >= 80 ? "🟡" : "🟢";
      return `${emoji} ${b.category}: ${pct.toFixed(0)}% (${formatRupiah(b.spent || 0)}/${formatRupiah(b.limit_amount)})`;
    }).join("\n");
    return `📊 **Status semua budget:**\n\n${list}`;
  }

  // Goal
  if (/\bgoal|target|tujuan|impian\b/.test(lower)) {
    if (goals.length === 0) return "Belum ada goal yang diatur. Tetapkan target finansialmu lewat halaman /goals!";
    const goal = goals.find((g) => lower.includes(g.goal_name.toLowerCase().split(" ")[0]));
    if (goal) {
      const pct = (goal.current_amount / goal.target_amount) * 100;
      const sisa = goal.target_amount - goal.current_amount;
      return `🎯 **${goal.goal_name}:**\nProgress: ${formatRupiah(goal.current_amount)} / ${formatRupiah(goal.target_amount)} (${pct.toFixed(0)}%)\nKurang: ${formatRupiah(sisa)}`;
    }
    const list = goals.map((g) => {
      const pct = (g.current_amount / g.target_amount) * 100;
      return `🎯 ${g.goal_name}: ${pct.toFixed(0)}% (${formatRupiah(g.current_amount)}/${formatRupiah(g.target_amount)})`;
    }).join("\n");
    return `🎯 **Progress semua goal:**\n\n${list}`;
  }

  // Transaksi terakhir
  if (/\bterakhir|terbaru|recent|latest\b/.test(lower)) {
    const recent = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    if (recent.length === 0) return "Belum ada transaksi tercatat.";
    const list = recent.map((t) => {
      const w = wallets.find((x) => x.id === t.wallet_id);
      const sign = t.type === "income" ? "+" : "-";
      return `${t.type === "income" ? "📈" : "📉"} ${t.description} — ${sign}${formatRupiah(t.amount)} (${w?.icon || ""} ${w?.name || "—"})`;
    }).join("\n");
    return `🕐 **5 transaksi terakhir:**\n\n${list}`;
  }

  // Pengeluaran / Pemasukan per periode
  const asksExpense = /\bpengeluaran|expense|keluar|habis|spent|spend\b/i.test(lower);
  const asksIncome = /\bpemasukan|income|masuk|earn|earned\b/i.test(lower);
  const asksBoth = asksExpense && asksIncome;

  if (asksExpense || asksIncome || range) {
    const r = range || (() => {
      const now = new Date();
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now), label: "bulan ini" };
    })();

    const inPeriod = transactions.filter((t) => inRange(t.date, r));
    const totalExpense = inPeriod.filter((t) => t.type === "expense" && !t.goal_id).reduce((s, t) => s + t.amount, 0);
    const totalIncome = inPeriod.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalSavings = inPeriod.filter((t) => t.goal_id).reduce((s, t) => s + t.amount, 0);

    if (inPeriod.length === 0) {
      return `Tidak ada transaksi tercatat untuk **${r.label}**.`;
    }

    if (asksBoth || (!asksExpense && !asksIncome)) {
      const savingsLine = totalSavings > 0 ? `\n🐷 Setoran goal: ${formatRupiah(totalSavings)}` : "";
      return `📅 **Ringkasan ${r.label}:**\n\n📈 Pemasukan: ${formatRupiah(totalIncome)}\n📉 Pengeluaran: ${formatRupiah(totalExpense)}${savingsLine}\n💰 Net: ${formatRupiah(totalIncome - totalExpense - totalSavings)}\n\nTotal ${inPeriod.length} transaksi.`;
    }

    if (asksExpense) {
      const expenses = inPeriod.filter((t) => t.type === "expense" && !t.goal_id);
      if (expenses.length === 0) return `Tidak ada pengeluaran ${r.label}. Mantap! 👍`;
      const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const topList = top.map((t) => `• ${t.description}: ${formatRupiah(t.amount)}`).join("\n");
      return `📉 **Total pengeluaran ${r.label}:** ${formatRupiah(totalExpense)}\n\nDari ${expenses.length} transaksi. Yang terbesar:\n${topList}`;
    }

    if (asksIncome) {
      const incomes = inPeriod.filter((t) => t.type === "income");
      if (incomes.length === 0) return `Tidak ada pemasukan ${r.label}.`;
      const list = incomes.map((t) => `• ${t.description}: ${formatRupiah(t.amount)}`).join("\n");
      return `📈 **Total pemasukan ${r.label}:** ${formatRupiah(totalIncome)}\n\n${list}`;
    }
  }

  // Ringkasan / kondisi umum
  if (/\bkondisi|status|ringkasan|summary|keuangan|overview\b/.test(lower)) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = transactions.filter((t) => new Date(t.date) >= monthStart);
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
    return `📊 **Ringkasan keuanganmu bulan ini:**\n\n💰 Total saldo: ${formatRupiah(totalBalance)}\n📈 Pemasukan: ${formatRupiah(income)}\n📉 Pengeluaran: ${formatRupiah(expense)}\n💵 Net bulan ini: ${formatRupiah(income - expense)}\n\nTotal ${monthTxs.length} transaksi tercatat.`;
  }

  // Fallback
  return "Hmm, saya kurang paham pertanyaannya. Coba tanya seperti:\n• \"Berapa pengeluaran bulan ini?\"\n• \"Berapa saldo BCA?\"\n• \"Gimana progress goal Liburan Bali?\"\n• \"Tampilkan transaksi terakhir\"\n\nAtau ceritakan transaksi seperti: \"Beli kopi 30 ribu pakai GoPay\"";
}

/**
 * Detect a "transfer wallet to wallet" intent.
 * Matches phrases like:
 *  - "transfer 500 ribu dari BCA ke GoPay"
 *  - "pindahin 1 juta dari tunai ke BCA"
 *  - "kirim 200rb dari GoPay ke BCA"
 *  - "topup gopay 100 ribu dari BCA"
 */
export function parseTransfer(
  text: string,
  walletNames: { id: string; name: string }[],
): ParsedTransfer | null {
  if (isQuestion(text)) return null;
  const lower = text.toLowerCase();

  // Must mention transfer intent
  const hasTransferIntent =
    /\b(transfer|pindah(?:in|kan)?|kirim|kirimin|topup|top\s*up|move|send)\b/i.test(lower);
  if (!hasTransferIntent) return null;

  // Amount
  const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k|juta|jt|ratus)?/i);
  if (!amountMatch) return null;
  let amount = parseFloat(amountMatch[1].replace(",", "."));
  if (/juta|jt/i.test(text)) amount *= 1000000;
  else if (/ribu|rb|k/i.test(text) || amount < 10000) amount *= 1000;

  // Find both wallets: prefer "dari X ke Y" / "from X to Y" pattern
  let fromId: string | undefined;
  let toId: string | undefined;

  // Pattern: "dari <name>"
  for (const w of walletNames) {
    const name = w.name.toLowerCase();
    const re = new RegExp(`\\b(dari|from)\\s+${escapeRegex(name)}\\b`, "i");
    if (re.test(lower)) {
      fromId = w.id;
      break;
    }
  }
  // Pattern: "ke <name>"
  for (const w of walletNames) {
    const name = w.name.toLowerCase();
    const re = new RegExp(`\\b(ke|to)\\s+${escapeRegex(name)}\\b`, "i");
    if (re.test(lower)) {
      toId = w.id;
      break;
    }
  }

  // If still missing, match wallet names by position (first mentioned = from, second = to)
  if (!fromId || !toId) {
    const positions: { id: string; pos: number }[] = [];
    for (const w of walletNames) {
      const idx = lower.indexOf(w.name.toLowerCase());
      if (idx >= 0) positions.push({ id: w.id, pos: idx });
    }
    positions.sort((a, b) => a.pos - b.pos);
    if (!fromId && positions[0]) fromId = positions[0].id;
    if (!toId && positions[1]) toId = positions[1].id;
  }

  // Handle "topup gopay 100 ribu dari BCA" — gopay is the destination, BCA is source
  if (/\btopup|top\s*up\b/i.test(lower) && !toId) {
    // First wallet mentioned (without "dari" prefix) is the destination in topup phrasing
    for (const w of walletNames) {
      if (lower.includes(w.name.toLowerCase()) && w.id !== fromId) {
        toId = w.id;
        break;
      }
    }
  }

  if (!fromId || !toId || fromId === toId) return null;

  const fromW = walletNames.find((w) => w.id === fromId);
  const toW = walletNames.find((w) => w.id === toId);
  if (!fromW || !toW) return null;

  return {
    kind: "transfer",
    from_wallet_id: fromId,
    to_wallet_id: toId,
    from_name: fromW.name,
    to_name: toW.name,
    amount,
  };
}

/**
 * Detect a "setor ke goal" / "tambah dana ke goal" intent.
 * Matches phrases like:
 *  - "tambah dana darurat 500 ribu dari BCA"
 *  - "nabung untuk liburan bali 1 juta tunai"
 *  - "setor ke goal laptop baru 200 ribu pakai GoPay"
 *  - "isi goal dana darurat 500 rb dari BCA"
 */
export function parseGoalContribution(
  text: string,
  goals: Goal[],
  walletNames: { id: string; name: string }[],
): ParsedGoalContribution | null {
  if (isQuestion(text)) return null;

  const lower = text.toLowerCase();

  const hasGoalIntent =
    /\b(nabung|menabung|setor|isi|kontribusi|alokasi|sisihkan)\b/.test(lower) ||
    /\b(tambah(?:in|kan)?|tambah|topup|top\s*up)\b.*\b(goal|target|dana|tabungan|impian)\b/.test(lower) ||
    /\b(ke|untuk|buat)\s+(goal|target|dana|tabungan|impian)\b/.test(lower);

  // Try matching against actual goal names
  let matchedGoal: Goal | null = null;
  for (const g of goals) {
    const name = g.goal_name.toLowerCase();
    if (lower.includes(name)) {
      matchedGoal = g;
      break;
    }
    // try first significant word of the goal name (e.g. "Dana Darurat" → "darurat")
    const words = name.split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => lower.includes(w))) {
      matchedGoal = g;
      break;
    }
  }

  if (!matchedGoal && !hasGoalIntent) return null;
  if (!matchedGoal) return null;

  // Amount
  const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k|juta|jt|ratus)?/i);
  if (!amountMatch) return null;
  let amount = parseFloat(amountMatch[1].replace(",", "."));
  if (/juta|jt/i.test(text)) amount *= 1000000;
  else if (/ribu|rb|k/i.test(text) || amount < 10000) amount *= 1000;

  // Source wallet
  let wallet_id: string | undefined;
  for (const w of walletNames) {
    if (lower.includes(w.name.toLowerCase())) {
      wallet_id = w.id;
      break;
    }
  }
  if (!wallet_id) {
    if (/tunai|cash/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("tunai"))?.id;
    else if (/kredit|credit/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("kredit"))?.id;
  }
  wallet_id = wallet_id || walletNames[0]?.id;
  if (!wallet_id) return null;

  return {
    kind: "goal_contribution",
    goal_id: matchedGoal.id,
    goal_name: matchedGoal.goal_name,
    amount,
    wallet_id,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Smart description from raw chat text. Strips amounts, wallet mentions, and filler words.
 * Falls back to category name if cleanup produces an empty/too-short result.
 *
 * Examples:
 *   "Makan siang 50 ribu pakai GoPay" → "Makan siang"
 *   "beli kopi 30rb di starbucks pakai gopay" → "Beli kopi di starbucks"
 *   "dapat gaji 10 juta masuk BCA bulan ini" → "Gaji bulan ini"
 *   "bayar listrik 500ribu" → "Bayar listrik"
 *   "50rb" → "Makanan" (fallback ke category)
 */
export function generateDescription(
  text: string,
  category: string,
  walletNames: string[],
  type: "income" | "expense",
): string {
  let s = ` ${text.trim()} `;

  // 1. Strip amount + optional currency word (50 ribu / 50rb / 50k / 50.000 / Rp 50000 / IDR 50000)
  s = s.replace(/\b(?:rp|idr)\s*\d+(?:[.,]\d+)*\b/gi, " ");
  s = s.replace(/\b\d+(?:[.,]\d+)*\s*(?:ribu|rb|k|juta|jt|ratus|rp|idr)\b/gi, " ");
  s = s.replace(/\b\d+(?:[.,]\d+)*\b/g, " ");

  // 2. Strip "(pakai|dari|ke|via|lewat|masuk|using|from|to|with) <wallet name>"
  for (const w of walletNames) {
    const name = escapeRegex(w);
    s = s.replace(
      new RegExp(`\\b(pakai|dari|ke|via|lewat|masuk|di|using|from|to|with|in|into|by)\\s+${name}\\b`, "gi"),
      " ",
    );
    // Also remove the wallet name alone (e.g., "bayar listrik BCA")
    s = s.replace(new RegExp(`\\b${name}\\b`, "gi"), " ");
  }

  // 3. Strip wallet type / payment method words
  s = s.replace(/\b(tunai|cash|kartu kredit|kartu|kredit|credit|bank|e-?wallet|ewallet|transfer|debit)\b/gi, " ");

  // 4. Strip leftover prepositions/connectors when adjacent to removed chunks
  s = s.replace(/\b(pakai|dari|via|lewat|masuk|using|with|by)\b/gi, " ");

  // 5. Strip noisy filler words / pronouns (be conservative — only multi-letter common ones)
  s = s.replace(/\b(hari ini|tadi|barusan|nih|deh|dong|sih|aja|saja|tuh|kak|aku|saya|gue|gw|gua|kita)\b/gi, " ");

  // 6. Punctuation → space, collapse, trim
  s = s.replace(/[,.;:!?()"'’“”]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  // 7. Strip a leading verb-like word that just adds noise for some patterns
  //    (e.g. "dapat gaji bulan ini" → "gaji bulan ini")
  if (type === "income") {
    s = s.replace(/^(dapat|terima|menerima|got|received|earn(?:ed)?)\s+/i, "");
  }

  // 8. If too short or empty, fall back to category
  if (s.length < 3) return category;

  // 9. Capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseTransaction(text: string, walletNames: { id: string; name: string }[]): ParsedTransaction | null {
  // Skip if it's a question
  if (isQuestion(text)) return null;

  const lower = text.toLowerCase();
  const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k|juta|jt|ratus)?/i);
  if (!amountMatch) return null;

  let amount = parseFloat(amountMatch[1].replace(",", "."));
  if (/juta|jt/i.test(text)) amount *= 1000000;
  else if (/ribu|rb|k/i.test(text) || amount < 10000) amount *= 1000;

  const isIncome = /gaji|pemasukan|dapat|terima|bonus|freelance|untung|income/i.test(lower);
  const type = isIncome ? "income" : "expense";

  let category = "Lainnya";
  if (/makan|minum|kopi|cafe|restaurant|warung|nasi|bakso|soto|pizza|burger/i.test(lower)) category = "Makanan";
  else if (/bensin|parkir|grab|gojek|ojek|bis|kereta|transjakarta|toll/i.test(lower)) category = "Transportasi";
  else if (/listrik|air|pdam|internet|wifi|pulsa|tagihan/i.test(lower)) category = "Tagihan";
  else if (/belanja|baju|sepatu|mall|tokopedia|shopee|lazada/i.test(lower)) category = "Belanja";
  else if (/bioskop|nonton|game|hiburan|netflix|spotify/i.test(lower)) category = "Hiburan";
  else if (/gaji|salary/i.test(lower)) category = "Gaji";
  else if (/freelance|proyek|project/i.test(lower)) category = "Freelance";

  let wallet_id: string | undefined;
  for (const w of walletNames) {
    if (lower.includes(w.name.toLowerCase())) {
      wallet_id = w.id;
      break;
    }
  }
  if (!wallet_id) {
    if (/tunai|cash/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("tunai"))?.id;
    else if (/kredit|credit/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("kredit"))?.id;
  }
  wallet_id = wallet_id || walletNames[0]?.id;

  // AI-style description cleanup — strips amount, wallet, and noise
  const description = generateDescription(
    text,
    category,
    walletNames.map((w) => w.name),
    type,
  );

  return {
    type,
    amount,
    category,
    description,
    date: new Date().toISOString().split("T")[0],
    wallet_id,
  };
}
