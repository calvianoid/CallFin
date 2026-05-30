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

export type Locale = "id" | "en";

// ───────────────────────────────────────────────────────────────────────────
// Month names — both Indonesian and English aliases
// ───────────────────────────────────────────────────────────────────────────
const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_LOOKUP: Record<string, number> = {
  // Indonesian
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
  // English
  january: 1,
  february: 2,
  march: 3,
  may: 5,
  june: 6,
  july: 7,
  august: 8, aug: 8,
  october: 10, oct: 10,
};

const MONTH_REGEX_ALTERNATION =
  "januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|" +
  "january|february|march|april|may|june|july|august|september|october|november|december|" +
  "jan|feb|mar|apr|jun|jul|agu|sep|sept|okt|oct|nov|des|dec|aug";

// ───────────────────────────────────────────────────────────────────────────
// Question detection — accepts both languages
// ───────────────────────────────────────────────────────────────────────────
const QUESTION_WORDS = /^(berapa|apakah|gimana|bagaimana|kapan|dimana|kenapa|mengapa|siapa|apa|tunjukkan|cek|lihat|tampilkan|show|how|what|when|where|why|cari|tolong|coba|bisa|tell|give|list|did)\b/i;
const CONTAINS_QUESTION_HINT = /(berapa|apakah|gimana|bagaimana|kapan|dimana|kenapa|mengapa|tunjukkan|tampilkan|lihat|cek|how\s+much|how\s+many|what.?s|tell\s+me|show\s+me|did\s+i\s+spend|did\s+i\s+earn|how\s+is|what\s+is)\s|\?/i;

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
  /** Bilingual label tuple — index 0 = ID, 1 = EN. */
  label: [string, string];
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

function pickLabel(label: [string, string], locale: Locale): string {
  return locale === "en" ? label[1] : label[0];
}

function parseDateRange(text: string, now = new Date()): DateRange | null {
  const lower = text.toLowerCase();

  if (/\bhari\s*ini\b|\btoday\b/.test(lower)) {
    return { from: startOfDay(now), to: endOfDay(now), label: ["hari ini", "today"] };
  }
  if (/\bkemarin\b|\byesterday\b/.test(lower)) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), label: ["kemarin", "yesterday"] };
  }
  if (/\bminggu\s*ini\b|\bthis\s*week\b/.test(lower)) {
    const day = now.getDay(); // 0 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return { from: startOfDay(monday), to: endOfDay(now), label: ["minggu ini", "this week"] };
  }
  if (/\bminggu\s*lalu\b|\blast\s*week\b/.test(lower)) {
    const day = now.getDay();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((day + 6) % 7) - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    return { from: startOfDay(lastMonday), to: endOfDay(lastSunday), label: ["minggu lalu", "last week"] };
  }
  if (/\bbulan\s*lalu\b|\blast\s*month\b/.test(lower)) {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { from, to, label: ["bulan lalu", "last month"] };
  }
  if (/\bbulan\s*ini\b|\bthis\s*month\b/.test(lower)) {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: endOfDay(now), label: ["bulan ini", "this month"] };
  }
  if (/\btahun\s*ini\b|\bthis\s*year\b/.test(lower)) {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from, to: endOfDay(now), label: ["tahun ini", "this year"] };
  }

  // "tanggal 15 mei" / "15 mei" / "15/5" / "15-5-2026" / "May 15"
  const dmyMatch = lower.match(/(\d{1,2})[\s/-](\d{1,2}|[a-z]+)(?:[\s/-](\d{2,4}))?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    let month: number;
    if (/^\d+$/.test(dmyMatch[2])) month = parseInt(dmyMatch[2]);
    else month = MONTHS_LOOKUP[dmyMatch[2]] || 0;
    const year = dmyMatch[3] ? (dmyMatch[3].length === 2 ? 2000 + parseInt(dmyMatch[3]) : parseInt(dmyMatch[3])) : now.getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day);
      return {
        from: startOfDay(d),
        to: endOfDay(d),
        label: [`${day} ${MONTH_NAMES_ID[month - 1]}`, `${MONTH_NAMES_EN[month - 1]} ${day}`],
      };
    }
  }

  // Try "month day" English pattern: "may 15" / "march 1"
  const mdyMatch = lower.match(new RegExp(`\\b(${MONTH_REGEX_ALTERNATION})\\b\\s+(\\d{1,2})`, "i"));
  if (mdyMatch) {
    const month = MONTHS_LOOKUP[mdyMatch[1].toLowerCase()];
    const day = parseInt(mdyMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(now.getFullYear(), month - 1, day);
      return {
        from: startOfDay(d),
        to: endOfDay(d),
        label: [`${day} ${MONTH_NAMES_ID[month - 1]}`, `${MONTH_NAMES_EN[month - 1]} ${day}`],
      };
    }
  }

  // "bulan mei" / "in may" / just "mei" / "may"
  const monthMatch = lower.match(new RegExp(`\\b(${MONTH_REGEX_ALTERNATION})\\b`, "i"));
  if (monthMatch) {
    const month = MONTHS_LOOKUP[monthMatch[1].toLowerCase()];
    if (month) {
      const from = new Date(now.getFullYear(), month - 1, 1);
      const to = new Date(now.getFullYear(), month, 0, 23, 59, 59);
      return {
        from,
        to,
        label: [`bulan ${MONTH_NAMES_ID[month - 1]}`, MONTH_NAMES_EN[month - 1]],
      };
    }
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

// Tiny helper for locale-aware string pick.
function L(locale: Locale, id: string, en: string): string {
  return locale === "en" ? en : id;
}

export function answerQuery(text: string, ctx: AnswerContext, locale: Locale = "id"): string {
  const lower = text.toLowerCase();
  const { transactions, wallets, budgets, goals } = ctx;
  const range = parseDateRange(text);

  // Saldo per dompet / total
  if (/\bsaldo\b|\bbalance\b/.test(lower)) {
    if (/total|semua|all/.test(lower)) {
      const total = wallets.reduce((s, w) => s + w.balance, 0);
      const list = wallets.map((w) => `${w.icon} ${w.name}: ${formatRupiah(w.balance)}`).join("\n");
      return `💰 **${L(locale, "Total saldo semua dompet", "Total balance across all wallets")}:** ${formatRupiah(total)}\n\n${list}`;
    }
    const wallet = wallets.find((w) => lower.includes(w.name.toLowerCase()));
    if (wallet) {
      return `${wallet.icon} **${L(locale, `Saldo ${wallet.name}`, `${wallet.name} balance`)}:** ${formatRupiah(wallet.balance)}`;
    }
    const total = wallets.reduce((s, w) => s + w.balance, 0);
    return `💰 **${L(locale, "Total saldo", "Total balance")}:** ${formatRupiah(total)}\n\n` +
      wallets.map((w) => `• ${w.icon} ${w.name}: ${formatRupiah(w.balance)}`).join("\n");
  }

  // Budget
  if (/\bbudget|anggaran\b/.test(lower)) {
    if (budgets.length === 0) {
      return L(
        locale,
        "Belum ada budget yang diatur. Kamu bisa tambah lewat halaman /budgets ya!",
        "No budgets set yet. You can add one on the /budgets page!",
      );
    }
    const cat = budgets.find((b) => lower.includes(b.category.toLowerCase()));
    if (cat) {
      const pct = ((cat.spent || 0) / cat.limit_amount) * 100;
      const sisa = cat.limit_amount - (cat.spent || 0);
      const status =
        pct >= 95 ? L(locale, "🔴 hampir habis!", "🔴 almost maxed!")
        : pct >= 80 ? L(locale, "🟡 waspada", "🟡 watch out")
        : L(locale, "🟢 aman", "🟢 safe");
      return L(
        locale,
        `📊 **Budget ${cat.category}:**\nTerpakai: ${formatRupiah(cat.spent || 0)} dari ${formatRupiah(cat.limit_amount)} (${pct.toFixed(0)}%)\nSisa: ${formatRupiah(sisa)}\nStatus: ${status}`,
        `📊 **${cat.category} budget:**\nUsed: ${formatRupiah(cat.spent || 0)} of ${formatRupiah(cat.limit_amount)} (${pct.toFixed(0)}%)\nRemaining: ${formatRupiah(sisa)}\nStatus: ${status}`,
      );
    }
    const list = budgets.map((b) => {
      const pct = ((b.spent || 0) / b.limit_amount) * 100;
      const emoji = pct >= 95 ? "🔴" : pct >= 80 ? "🟡" : "🟢";
      return `${emoji} ${b.category}: ${pct.toFixed(0)}% (${formatRupiah(b.spent || 0)}/${formatRupiah(b.limit_amount)})`;
    }).join("\n");
    return `📊 **${L(locale, "Status semua budget", "All budgets status")}:**\n\n${list}`;
  }

  // Goal
  if (/\bgoal|target|tujuan|impian\b/.test(lower)) {
    if (goals.length === 0) {
      return L(
        locale,
        "Belum ada goal yang diatur. Tetapkan target finansialmu lewat halaman /goals!",
        "No goals set yet. Set your financial targets on the /goals page!",
      );
    }
    const goal = goals.find((g) => lower.includes(g.goal_name.toLowerCase().split(" ")[0]));
    if (goal) {
      const pct = (goal.current_amount / goal.target_amount) * 100;
      const sisa = goal.target_amount - goal.current_amount;
      return L(
        locale,
        `🎯 **${goal.goal_name}:**\nProgress: ${formatRupiah(goal.current_amount)} / ${formatRupiah(goal.target_amount)} (${pct.toFixed(0)}%)\nKurang: ${formatRupiah(sisa)}`,
        `🎯 **${goal.goal_name}:**\nProgress: ${formatRupiah(goal.current_amount)} / ${formatRupiah(goal.target_amount)} (${pct.toFixed(0)}%)\nShort by: ${formatRupiah(sisa)}`,
      );
    }
    const list = goals.map((g) => {
      const pct = (g.current_amount / g.target_amount) * 100;
      return `🎯 ${g.goal_name}: ${pct.toFixed(0)}% (${formatRupiah(g.current_amount)}/${formatRupiah(g.target_amount)})`;
    }).join("\n");
    return `🎯 **${L(locale, "Progress semua goal", "All goals progress")}:**\n\n${list}`;
  }

  // Transaksi terakhir / Recent transactions
  if (/\bterakhir|terbaru|recent|latest|last\s+transactions?\b/.test(lower)) {
    const recent = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    if (recent.length === 0) {
      return L(locale, "Belum ada transaksi tercatat.", "No transactions recorded yet.");
    }
    const list = recent.map((t) => {
      const w = wallets.find((x) => x.id === t.wallet_id);
      const sign = t.type === "income" ? "+" : "-";
      return `${t.type === "income" ? "📈" : "📉"} ${t.description} — ${sign}${formatRupiah(t.amount)} (${w?.icon || ""} ${w?.name || "—"})`;
    }).join("\n");
    return `🕐 **${L(locale, "5 transaksi terakhir", "Last 5 transactions")}:**\n\n${list}`;
  }

  // Pengeluaran / Pemasukan per periode
  const asksExpense = /\bpengeluaran|expense|expenses|keluar|habis|spent|spend|spending\b/i.test(lower);
  const asksIncome = /\bpemasukan|income|incomes|masuk|earn|earned|earning\b/i.test(lower);
  const asksBoth = asksExpense && asksIncome;

  if (asksExpense || asksIncome || range) {
    const r = range || ((): DateRange => {
      const now = new Date();
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now), label: ["bulan ini", "this month"] };
    })();
    const rLabel = pickLabel(r.label, locale);

    const inPeriod = transactions.filter((t) => inRange(t.date, r));
    const totalExpense = inPeriod.filter((t) => t.type === "expense" && !t.goal_id).reduce((s, t) => s + t.amount, 0);
    const totalIncome = inPeriod.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalSavings = inPeriod.filter((t) => t.goal_id).reduce((s, t) => s + t.amount, 0);

    if (inPeriod.length === 0) {
      return L(
        locale,
        `Tidak ada transaksi tercatat untuk **${rLabel}**.`,
        `No transactions recorded for **${rLabel}**.`,
      );
    }

    if (asksBoth || (!asksExpense && !asksIncome)) {
      const savingsLine =
        totalSavings > 0
          ? `\n🐷 ${L(locale, "Setoran goal", "Goal savings")}: ${formatRupiah(totalSavings)}`
          : "";
      return L(
        locale,
        `📅 **Ringkasan ${rLabel}:**\n\n📈 Pemasukan: ${formatRupiah(totalIncome)}\n📉 Pengeluaran: ${formatRupiah(totalExpense)}${savingsLine}\n💰 Net: ${formatRupiah(totalIncome - totalExpense - totalSavings)}\n\nTotal ${inPeriod.length} transaksi.`,
        `📅 **Summary for ${rLabel}:**\n\n📈 Income: ${formatRupiah(totalIncome)}\n📉 Expense: ${formatRupiah(totalExpense)}${savingsLine}\n💰 Net: ${formatRupiah(totalIncome - totalExpense - totalSavings)}\n\n${inPeriod.length} transactions total.`,
      );
    }

    if (asksExpense) {
      const expenses = inPeriod.filter((t) => t.type === "expense" && !t.goal_id);
      if (expenses.length === 0) {
        return L(locale, `Tidak ada pengeluaran ${rLabel}. Mantap! 👍`, `No expenses for ${rLabel}. Nice! 👍`);
      }
      const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const topList = top.map((t) => `• ${t.description}: ${formatRupiah(t.amount)}`).join("\n");
      return L(
        locale,
        `📉 **Total pengeluaran ${rLabel}:** ${formatRupiah(totalExpense)}\n\nDari ${expenses.length} transaksi. Yang terbesar:\n${topList}`,
        `📉 **Total expense for ${rLabel}:** ${formatRupiah(totalExpense)}\n\nFrom ${expenses.length} transactions. Top ones:\n${topList}`,
      );
    }

    if (asksIncome) {
      const incomes = inPeriod.filter((t) => t.type === "income");
      if (incomes.length === 0) {
        return L(locale, `Tidak ada pemasukan ${rLabel}.`, `No income for ${rLabel}.`);
      }
      const list = incomes.map((t) => `• ${t.description}: ${formatRupiah(t.amount)}`).join("\n");
      return L(
        locale,
        `📈 **Total pemasukan ${rLabel}:** ${formatRupiah(totalIncome)}\n\n${list}`,
        `📈 **Total income for ${rLabel}:** ${formatRupiah(totalIncome)}\n\n${list}`,
      );
    }
  }

  // Ringkasan / kondisi umum
  if (/\bkondisi|status|ringkasan|summary|keuangan|overview|finance\b/.test(lower)) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = transactions.filter((t) => new Date(t.date) >= monthStart);
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
    return L(
      locale,
      `📊 **Ringkasan keuanganmu bulan ini:**\n\n💰 Total saldo: ${formatRupiah(totalBalance)}\n📈 Pemasukan: ${formatRupiah(income)}\n📉 Pengeluaran: ${formatRupiah(expense)}\n💵 Net bulan ini: ${formatRupiah(income - expense)}\n\nTotal ${monthTxs.length} transaksi tercatat.`,
      `📊 **Your financial summary this month:**\n\n💰 Total balance: ${formatRupiah(totalBalance)}\n📈 Income: ${formatRupiah(income)}\n📉 Expense: ${formatRupiah(expense)}\n💵 Net this month: ${formatRupiah(income - expense)}\n\n${monthTxs.length} transactions recorded.`,
    );
  }

  // Fallback
  return L(
    locale,
    "Hmm, saya kurang paham pertanyaannya. Coba tanya seperti:\n• \"Berapa pengeluaran bulan ini?\"\n• \"Berapa saldo BCA?\"\n• \"Gimana progress goal Liburan Bali?\"\n• \"Tampilkan transaksi terakhir\"\n\nAtau ceritakan transaksi seperti: \"Beli kopi 30 ribu pakai GoPay\"",
    "Hmm, I'm not sure I follow. Try asking like:\n• \"How much did I spend this month?\"\n• \"What's my BCA balance?\"\n• \"How's my Bali vacation goal?\"\n• \"Show me my recent transactions\"\n\nOr tell me a transaction like: \"Coffee 30k with GoPay\"",
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Amount parsing helper — recognizes both ID & EN suffixes
// ───────────────────────────────────────────────────────────────────────────
function parseAmount(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k|juta|jt|million|mil|m|ratus|hundred)?/i);
  if (!m) return null;
  let amount = parseFloat(m[1].replace(",", "."));
  if (/juta|jt|million|mil|\bm\b/i.test(text)) amount *= 1_000_000;
  else if (/ribu|rb|\bk\b|thousand/i.test(text) || amount < 10000) amount *= 1000;
  return amount;
}

/**
 * Detect a "transfer wallet to wallet" intent.
 * Matches phrases like:
 *  - "transfer 500 ribu dari BCA ke GoPay"
 *  - "pindahin 1 juta dari tunai ke BCA"
 *  - "topup gopay 100 ribu dari BCA"
 *  - "send 500k from BCA to GoPay"
 *  - "move 1m from BCA to GoPay"
 */
export function parseTransfer(
  text: string,
  walletNames: { id: string; name: string }[],
): ParsedTransfer | null {
  if (isQuestion(text)) return null;
  const lower = text.toLowerCase();

  const hasTransferIntent =
    /\b(transfer|pindah(?:in|kan)?|kirim|kirimin|topup|top\s*up|move|send|wire)\b/i.test(lower);
  if (!hasTransferIntent) return null;

  const amount = parseAmount(text);
  if (amount == null) return null;

  let fromId: string | undefined;
  let toId: string | undefined;

  for (const w of walletNames) {
    const name = w.name.toLowerCase();
    const re = new RegExp(`\\b(dari|from|out\\s+of)\\s+${escapeRegex(name)}\\b`, "i");
    if (re.test(lower)) {
      fromId = w.id;
      break;
    }
  }
  for (const w of walletNames) {
    const name = w.name.toLowerCase();
    const re = new RegExp(`\\b(ke|to|into)\\s+${escapeRegex(name)}\\b`, "i");
    if (re.test(lower)) {
      toId = w.id;
      break;
    }
  }

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

  if (/\btopup|top\s*up\b/i.test(lower) && !toId) {
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
 * Detect a "setor ke goal" / "save into goal" intent.
 * Matches phrases like:
 *  - "tambah dana darurat 500 ribu dari BCA"
 *  - "nabung untuk liburan bali 1 juta tunai"
 *  - "save 500k from BCA into emergency fund"
 *  - "contribute 1m to bali vacation"
 *  - "put 200k into goal X from BCA"
 */
export function parseGoalContribution(
  text: string,
  goals: Goal[],
  walletNames: { id: string; name: string }[],
): ParsedGoalContribution | null {
  if (isQuestion(text)) return null;

  const lower = text.toLowerCase();

  const hasGoalIntent =
    /\b(nabung|menabung|setor|isi|kontribusi|alokasi|sisihkan|save|contribute|deposit|put|allocate)\b/.test(lower) ||
    /\b(tambah(?:in|kan)?|tambah|topup|top\s*up|add)\b.*\b(goal|target|dana|tabungan|impian|fund)\b/.test(lower) ||
    /\b(ke|untuk|buat|to|into|for)\s+(goal|target|dana|tabungan|impian|fund)\b/.test(lower);

  let matchedGoal: Goal | null = null;
  for (const g of goals) {
    const name = g.goal_name.toLowerCase();
    if (lower.includes(name)) {
      matchedGoal = g;
      break;
    }
    const words = name.split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => lower.includes(w))) {
      matchedGoal = g;
      break;
    }
  }

  if (!matchedGoal && !hasGoalIntent) return null;
  if (!matchedGoal) return null;

  const amount = parseAmount(text);
  if (amount == null) return null;

  let wallet_id: string | undefined;
  for (const w of walletNames) {
    if (lower.includes(w.name.toLowerCase())) {
      wallet_id = w.id;
      break;
    }
  }
  if (!wallet_id) {
    if (/tunai|cash/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("tunai") || w.name.toLowerCase().includes("cash"))?.id;
    else if (/kredit|credit/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("kredit") || w.name.toLowerCase().includes("credit"))?.id;
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
 */
export function generateDescription(
  text: string,
  category: string,
  walletNames: string[],
  type: "income" | "expense",
): string {
  let s = ` ${text.trim()} `;

  // 1. Strip amount + optional currency word
  s = s.replace(/\b(?:rp|idr|\$)\s*\d+(?:[.,]\d+)*\b/gi, " ");
  s = s.replace(/\b\d+(?:[.,]\d+)*\s*(?:ribu|rb|k|juta|jt|million|mil|m|ratus|hundred|thousand|rp|idr)\b/gi, " ");
  s = s.replace(/\b\d+(?:[.,]\d+)*\b/g, " ");

  // 2. Strip "<preposition> <wallet name>"
  for (const w of walletNames) {
    const name = escapeRegex(w);
    s = s.replace(
      new RegExp(`\\b(pakai|dari|ke|via|lewat|masuk|di|using|from|to|with|in|into|by|out\\s+of)\\s+${name}\\b`, "gi"),
      " ",
    );
    s = s.replace(new RegExp(`\\b${name}\\b`, "gi"), " ");
  }

  // 3. Strip wallet type / payment method words
  s = s.replace(/\b(tunai|cash|kartu kredit|kartu|kredit|credit|bank|e-?wallet|ewallet|transfer|debit)\b/gi, " ");

  // 4. Strip leftover prepositions/connectors
  s = s.replace(/\b(pakai|dari|via|lewat|masuk|using|with|by|from|to|into)\b/gi, " ");

  // 5. Strip filler words / pronouns
  s = s.replace(/\b(hari ini|tadi|barusan|nih|deh|dong|sih|aja|saja|tuh|kak|aku|saya|gue|gw|gua|kita|today|just|now|i|me|my)\b/gi, " ");

  // 6. Punctuation → space, collapse, trim
  s = s.replace(/[,.;:!?()"'’“”]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  // 7. Strip leading verb-like word for income
  if (type === "income") {
    s = s.replace(/^(dapat|terima|menerima|got|received|earn(?:ed)?)\s+/i, "");
  }

  // 8. If too short or empty, fall back to category
  if (s.length < 3) return category;

  // 9. Capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseTransaction(text: string, walletNames: { id: string; name: string }[]): ParsedTransaction | null {
  if (isQuestion(text)) return null;

  const lower = text.toLowerCase();
  const amount = parseAmount(text);
  if (amount == null) return null;

  const isIncome = /gaji|pemasukan|dapat|terima|bonus|freelance|untung|income|salary|earned|received|got\s+paid|paycheck/i.test(lower);
  const type = isIncome ? "income" : "expense";

  let category = "Lainnya";
  // Food (ID + EN)
  if (/makan|minum|kopi|cafe|restaurant|warung|nasi|bakso|soto|pizza|burger|food|lunch|dinner|breakfast|brunch|meal|snack|drink|coffee|tea|eat/i.test(lower)) category = "Makanan";
  // Transport
  else if (/bensin|parkir|grab|gojek|ojek|bis|kereta|transjakarta|toll|gas|gasoline|fuel|taxi|uber|bus|train|parking|ride/i.test(lower)) category = "Transportasi";
  // Bills
  else if (/listrik|air|pdam|internet|wifi|pulsa|tagihan|electricity|water|phone|bill|utility|utilities/i.test(lower)) category = "Tagihan";
  // Shopping
  else if (/belanja|baju|sepatu|mall|tokopedia|shopee|lazada|shop|shopping|clothing|clothes|shoes|amazon|cart/i.test(lower)) category = "Belanja";
  // Entertainment
  else if (/bioskop|nonton|game|hiburan|netflix|spotify|movie|cinema|concert|entertainment|streaming/i.test(lower)) category = "Hiburan";
  // Salary
  else if (/gaji|salary|paycheck|payroll/i.test(lower)) category = "Gaji";
  // Freelance
  else if (/freelance|proyek|project|gig|side\s+hustle|client/i.test(lower)) category = "Freelance";

  let wallet_id: string | undefined;
  for (const w of walletNames) {
    if (lower.includes(w.name.toLowerCase())) {
      wallet_id = w.id;
      break;
    }
  }
  if (!wallet_id) {
    if (/tunai|cash/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("tunai") || w.name.toLowerCase().includes("cash"))?.id;
    else if (/kredit|credit/i.test(lower)) wallet_id = walletNames.find((w) => w.name.toLowerCase().includes("kredit") || w.name.toLowerCase().includes("credit"))?.id;
  }
  wallet_id = wallet_id || walletNames[0]?.id;

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
