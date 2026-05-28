"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Transaction, Budget, Goal, Wallet, Category } from "@/types";
import { mockTransactions, mockBudgets, mockGoals, mockWallets, DEFAULT_CATEGORIES } from "./mock-data";

const SUPABASE_READY =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface StoreContextValue {
  profile: UserProfile | null;
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  categories: Category[];
  addWallet: (w: Omit<Wallet, "id" | "user_id">) => void;
  updateWallet: (id: string, patch: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;
  addTransaction: (t: Omit<Transaction, "id" | "user_id">) => Transaction;
  deleteTransaction: (id: string) => void;
  addBudget: (b: Omit<Budget, "id" | "user_id">) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addGoal: (g: Omit<Goal, "id" | "user_id">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  /** Move money from a wallet into a goal — updates wallet, goal, and records a transaction. */
  addGoalContribution: (goalId: string, walletId: string, amount: number, note?: string) => void;
  /** Move money between two wallets. Updates both balances and records ONE transaction with type "transfer". */
  addTransfer: (fromWalletId: string, toWalletId: string, amount: number, note?: string) => void;
  addCategory: (c: Omit<Category, "id" | "user_id" | "isDefault" | "isInternal">) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id" | "user_id">>) => void;
  deleteCategory: (id: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>(SUPABASE_READY ? [] : mockWallets);
  const [transactions, setTransactions] = useState<Transaction[]>(SUPABASE_READY ? [] : mockTransactions);
  const [budgets, setBudgets] = useState<Budget[]>(SUPABASE_READY ? [] : mockBudgets);
  const [goals, setGoals] = useState<Goal[]>(SUPABASE_READY ? [] : mockGoals);
  const [categories, setCategories] = useState<Category[]>(() =>
    SUPABASE_READY ? [] : DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: `cat-${i}`, user_id: "u1" }))
  );

  // Hydrate from Supabase on mount. Each table loads independently so a missing
  // table/view (e.g. budget_status not yet created) doesn't blow the whole load
  // and silently fall back to mock data — which is far more confusing than just
  // showing empty state for the failing slice.
  useEffect(() => {
    if (!SUPABASE_READY) return;
    let cancelled = false;

    (async () => {
      const apis = await Promise.all([
        import("./api/profile"),
        import("./api/wallets"),
        import("./api/transactions"),
        import("./api/budgets"),
        import("./api/goals"),
        import("./api/categories"),
      ]);
      const [{ getProfile }, { listWallets }, { listTransactions }, { listBudgets }, { listGoals }, { listCategories }] = apis;

      async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
        try {
          return await fn();
        } catch (err) {
          console.error(`[store] Failed to load ${label}:`, err);
          return fallback;
        }
      }

      const [p, ws, txs, bs, gs, cs] = await Promise.all([
        safe("profile", getProfile, null as unknown as UserProfile | null),
        safe("wallets", listWallets, [] as Wallet[]),
        safe("transactions", listTransactions, [] as Transaction[]),
        safe("budgets", () => listBudgets(new Date().toISOString().slice(0, 7)), [] as Budget[]),
        safe("goals", listGoals, [] as Goal[]),
        safe("categories", listCategories, [] as Category[]),
      ]);

      if (cancelled) return;
      if (p) {
        const row = p as { id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null };
        setProfile({
          id: row.id,
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
          avatar_url: row.avatar_url,
        });
      }
      setWallets(ws);
      setTransactions(txs);
      setBudgets(bs);
      setGoals(gs);
      setCategories(cs);
    })();

    return () => { cancelled = true; };
  }, []);

  const updateProfileLocal = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    if (SUPABASE_READY) {
      import("./api/profile")
        .then((m) => m.updateProfile(patch as never))
        .catch((err) => console.error("[store] updateProfile failed:", err));
    }
  }, []);

  const addTransfer = useCallback((fromWalletId: string, toWalletId: string, amount: number, note?: string) => {
    if (fromWalletId === toWalletId || amount <= 0) return;

    let fromName = "";
    let toName = "";

    setWallets((prev) => {
      const fromW = prev.find((w) => w.id === fromWalletId);
      const toW = prev.find((w) => w.id === toWalletId);
      if (fromW) fromName = fromW.name;
      if (toW) toName = toW.name;
      return prev.map((w) => {
        if (w.id === fromWalletId) return { ...w, balance: w.balance - amount };
        if (w.id === toWalletId) return { ...w, balance: w.balance + amount };
        return w;
      });
    });

    const newTx: Transaction = {
      id: makeId(),
      user_id: "u1",
      wallet_id: fromWalletId,
      transfer_to_wallet_id: toWalletId,
      type: "transfer",
      amount,
      category: "Transfer",
      description: note || `Transfer ke ${toName || "dompet lain"}`,
      date: new Date().toISOString().split("T")[0],
    };
    setTransactions((prev) => [newTx, ...prev]);
    // intentionally don't touch budgets — transfers aren't expenses
    void fromName; // referenced for debugging if needed
  }, []);

  const addCategory = useCallback((c: Omit<Category, "id" | "user_id" | "isDefault" | "isInternal">) => {
    setCategories((prev) => [...prev, { ...c, id: makeId(), user_id: "u1" }]);
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Omit<Category, "id" | "user_id">>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addWallet = useCallback((w: Omit<Wallet, "id" | "user_id">) => {
    setWallets((prev) => [...prev, { ...w, id: makeId(), user_id: "u1" }]);
  }, []);

  const updateWallet = useCallback((id: string, patch: Partial<Wallet>) => {
    setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  const deleteWallet = useCallback((id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, "id" | "user_id">) => {
    const newTx: Transaction = { ...t, id: makeId(), user_id: "u1" };
    setTransactions((prev) => [newTx, ...prev]);

    // Update wallet balance
    setWallets((prev) =>
      prev.map((w) =>
        w.id === t.wallet_id
          ? { ...w, balance: t.type === "income" ? w.balance + t.amount : w.balance - t.amount }
          : w
      )
    );

    // Update budget spent — but only for real expenses, not goal contributions or transfers
    if (t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.category === t.category ? { ...b, spent: (b.spent || 0) + t.amount } : b
        )
      );
    }

    return newTx;
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addBudget = useCallback((b: Omit<Budget, "id" | "user_id">) => {
    setBudgets((prev) => [...prev, { ...b, id: makeId(), user_id: "u1" }]);
  }, []);

  const updateBudget = useCallback((id: string, patch: Partial<Budget>) => {
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addGoal = useCallback((g: Omit<Goal, "id" | "user_id">) => {
    setGoals((prev) => [...prev, { ...g, id: makeId(), user_id: "u1" }]);
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addGoalContribution = useCallback((goalId: string, walletId: string, amount: number, note?: string) => {
    let goalName = "Goal";
    setGoals((prev) => {
      const goal = prev.find((g) => g.id === goalId);
      if (goal) goalName = goal.goal_name;
      return prev.map((g) =>
        g.id === goalId ? { ...g, current_amount: g.current_amount + amount } : g
      );
    });

    const newTx: Transaction = {
      id: makeId(),
      user_id: "u1",
      wallet_id: walletId,
      type: "expense",
      amount,
      category: "Tabungan",
      description: note || `Setor ke goal: ${goalName}`,
      date: new Date().toISOString().split("T")[0],
      goal_id: goalId,
    };
    setTransactions((prev) => [newTx, ...prev]);

    setWallets((prev) =>
      prev.map((w) => (w.id === walletId ? { ...w, balance: w.balance - amount } : w))
    );
  }, []);

  return (
    <StoreContext.Provider
      value={{
        profile,
        wallets, transactions, budgets, goals, categories,
        addWallet, updateWallet, deleteWallet,
        addTransaction, deleteTransaction,
        addBudget, updateBudget, deleteBudget,
        addGoal, updateGoal, deleteGoal,
        addGoalContribution,
        addTransfer,
        addCategory, updateCategory, deleteCategory,
        updateProfile: updateProfileLocal,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
