export type TransactionType = "income" | "expense" | "transfer";

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  /** Tailwind class for badge, e.g. "bg-orange-100 text-orange-700" */
  color: string;
  icon?: string;
  isDefault?: boolean;
  /** Internal categories (e.g. "Tabungan") are managed by the app, hidden from manual pickers */
  isInternal?: boolean;
}

export type WalletType = "cash" | "bank" | "ewallet" | "credit";

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  balance: number;
  color: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  /** Set when this transaction is a contribution to a Goal. Excluded from normal expense totals. */
  goal_id?: string;
  /** Set when type === "transfer". The destination wallet id. wallet_id is the source. */
  transfer_to_wallet_id?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  month_year: string;
  spent?: number;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  wallet_id?: string;
}
