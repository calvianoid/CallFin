"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Transaction, Budget, Goal, Wallet, Category } from "@/types";
import {
  mockTransactions,
  mockBudgets,
  mockGoals,
  mockWallets,
  DEFAULT_CATEGORIES,
} from "./mock-data";

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
  /**
   * True while the initial hydration from Supabase is in flight. Components
   * can check this to render skeletons instead of empty states on first paint.
   * Stays false in mock-mode (no Supabase configured).
   */
  isHydrating: boolean;
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
  /** Edit a plain income/expense transaction (not transfer/goal). Returns the updated tx. */
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id" | "user_id">>) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (b: Omit<Budget, "id" | "user_id">) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addGoal: (g: Omit<Goal, "id" | "user_id">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  /** Move money from a wallet into a goal — updates wallet, goal, and records a transaction. */
  addGoalContribution: (
    goalId: string,
    walletId: string,
    amount: number,
    note?: string,
  ) => void;
  /** Move money between two wallets. Updates both balances and records ONE transaction with type "transfer". */
  addTransfer: (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    note?: string,
  ) => void;
  addCategory: (
    c: Omit<Category, "id" | "user_id" | "isDefault" | "isInternal">,
  ) => void;
  updateCategory: (
    id: string,
    patch: Partial<Omit<Category, "id" | "user_id">>,
  ) => void;
  deleteCategory: (id: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Start in hydrating state when Supabase is configured so consumers can show
  // skeletons immediately on first paint instead of an empty-state flash.
  const [isHydrating, setIsHydrating] = useState(SUPABASE_READY);
  const [wallets, setWallets] = useState<Wallet[]>(
    SUPABASE_READY ? [] : mockWallets,
  );
  const [transactions, setTransactions] = useState<Transaction[]>(
    SUPABASE_READY ? [] : mockTransactions,
  );
  const [budgets, setBudgets] = useState<Budget[]>(
    SUPABASE_READY ? [] : mockBudgets,
  );
  const [goals, setGoals] = useState<Goal[]>(SUPABASE_READY ? [] : mockGoals);
  const [categories, setCategories] = useState<Category[]>(() =>
    SUPABASE_READY
      ? []
      : DEFAULT_CATEGORIES.map((c, i) => ({
          ...c,
          id: `cat-${i}`,
          user_id: "u1",
        })),
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
      const [
        { getProfile },
        { listWallets },
        { listTransactions },
        { listBudgets },
        { listGoals },
        { listCategories },
      ] = apis;

      async function safe<T>(
        label: string,
        fn: () => Promise<T>,
        fallback: T,
      ): Promise<T> {
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
        safe(
          "budgets",
          () => listBudgets(new Date().toISOString().slice(0, 7)),
          [] as Budget[],
        ),
        safe("goals", listGoals, [] as Goal[]),
        safe("categories", listCategories, [] as Category[]),
      ]);

      if (cancelled) return;
      if (p) {
        const row = p as {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
        };
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
      setIsHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfileLocal = useCallback(async (patch: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    if (SUPABASE_READY) {
      const m = await import("./api/profile");
      await m.updateProfile(patch as never); // throws on failure so caller can show feedback
    }
  }, []);

  const addTransfer = useCallback(
    (
      fromWalletId: string,
      toWalletId: string,
      amount: number,
      note?: string,
    ) => {
      if (fromWalletId === toWalletId || amount <= 0) return;

      let fromName = "";
      let toName = "";

      setWallets((prev) => {
        const fromW = prev.find((w) => w.id === fromWalletId);
        const toW = prev.find((w) => w.id === toWalletId);
        if (fromW) fromName = fromW.name;
        if (toW) toName = toW.name;
        return prev.map((w) => {
          if (w.id === fromWalletId)
            return { ...w, balance: w.balance - amount };
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

      if (SUPABASE_READY) {
        import("./api/wallets")
          .then((m) =>
            m.transferBetweenWallets({
              from_wallet_id: fromWalletId,
              to_wallet_id: toWalletId,
              amount,
              description: note,
            }),
          )
          .catch((err) => console.error("[store] addTransfer failed:", err));
      }
    },
    [],
  );

  const addCategory = useCallback(
    (c: Omit<Category, "id" | "user_id" | "isDefault" | "isInternal">) => {
      const tempId = makeId();
      setCategories((prev) => [...prev, { ...c, id: tempId, user_id: "u1" }]);

      if (SUPABASE_READY) {
        import("./api/categories")
          .then((m) =>
            m.createCategory({
              name: c.name,
              type: c.type,
              color: c.color,
              icon: c.icon,
            }),
          )
          .then((created) => {
            setCategories((prev) =>
              prev.map((cat) => (cat.id === tempId ? created : cat)),
            );
          })
          .catch((err) => console.error("[store] addCategory failed:", err));
      }
    },
    [],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<Omit<Category, "id" | "user_id">>) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );

      if (SUPABASE_READY) {
        import("./api/categories")
          .then((m) => m.updateCategory(id, patch))
          .catch((err) => console.error("[store] updateCategory failed:", err));
      }
    },
    [],
  );

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));

    if (SUPABASE_READY) {
      import("./api/categories")
        .then((m) => m.deleteCategory(id))
        .catch((err) => console.error("[store] deleteCategory failed:", err));
    }
  }, []);

  const addWallet = useCallback((w: Omit<Wallet, "id" | "user_id">) => {
    const tempId = makeId();
    setWallets((prev) => [...prev, { ...w, id: tempId, user_id: "u1" }]);

    if (SUPABASE_READY) {
      import("./api/wallets")
        .then((m) =>
          m.createWallet({
            name: w.name,
            type: w.type,
            balance: w.balance,
            color: w.color,
            icon: w.icon,
          }),
        )
        .then((created) => {
          setWallets((prev) =>
            prev.map((wallet) => (wallet.id === tempId ? created : wallet)),
          );
        })
        .catch((err) => console.error("[store] addWallet failed:", err));
    }
  }, []);

  const updateWallet = useCallback((id: string, patch: Partial<Wallet>) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    );

    if (SUPABASE_READY) {
      import("./api/wallets")
        .then((m) => m.updateWallet(id, patch))
        .catch((err) => console.error("[store] updateWallet failed:", err));
    }
  }, []);

  const deleteWallet = useCallback((id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));

    if (SUPABASE_READY) {
      import("./api/wallets")
        .then((m) => m.deleteWallet(id))
        .catch((err) => console.error("[store] deleteWallet failed:", err));
    }
  }, []);

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id" | "user_id">) => {
      const tempId = makeId();
      const newTx: Transaction = { ...t, id: tempId, user_id: "u1" };
      setTransactions((prev) => [newTx, ...prev]);

      // Update wallet balance
      setWallets((prev) =>
        prev.map((w) =>
          w.id === t.wallet_id
            ? {
                ...w,
                balance:
                  t.type === "income"
                    ? w.balance + t.amount
                    : w.balance - t.amount,
              }
            : w,
        ),
      );

      // Update budget spent — but only for real expenses, not goal contributions or transfers
      if (t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id) {
        setBudgets((prev) =>
          prev.map((b) =>
            b.category === t.category
              ? { ...b, spent: (b.spent || 0) + t.amount }
              : b,
          ),
        );
      }

      if (SUPABASE_READY) {
        import("./api/transactions")
          .then((m) =>
            m.createTransaction({
              wallet_id: t.wallet_id,
              type: t.type as "income" | "expense",
              amount: t.amount,
              category: t.category,
              description: t.description,
              date: t.date,
            }),
          )
          .then((created) => {
            setTransactions((prev) =>
              prev.map((tx) => (tx.id === tempId ? created : tx)),
            );
          })
          .catch((err) => console.error("[store] addTransaction failed:", err));
      }

      return newTx;
    },
    [],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<Transaction, "id" | "user_id">>) => {
      const old = transactionsRef.current.find((t) => t.id === id);
      if (!old) return;

      // Only allow editing plain income/expense — transfer & goal contribution
      // have their own dialogs and the SQL trigger reversal is messier there.
      if (old.type === "transfer" || old.transfer_to_wallet_id || old.goal_id) {
        console.warn("[store] updateTransaction skipped: transfer/goal not editable");
        return;
      }

      const next: Transaction = {
        ...old,
        ...patch,
        id: old.id,
        user_id: old.user_id,
      };

      // 1. Replace the tx in the list.
      setTransactions((prev) => prev.map((t) => (t.id === id ? next : t)));

      // 2. Reverse the OLD wallet effect, then apply the NEW wallet effect.
      const oldDelta = old.type === "income" ? -old.amount : old.amount; // amount to ADD back
      const newDelta = next.type === "income" ? next.amount : -next.amount; // amount to APPLY
      setWallets((ws) =>
        ws.map((w) => {
          let bal = w.balance;
          if (w.id === old.wallet_id) bal += oldDelta;
          if (w.id === next.wallet_id) bal += newDelta;
          return bal === w.balance ? w : { ...w, balance: bal };
        }),
      );

      // 3. Reverse old budget impact, apply new budget impact.
      if (old.type === "expense") {
        setBudgets((bs) =>
          bs.map((b) =>
            b.category === old.category
              ? { ...b, spent: Math.max((b.spent || 0) - old.amount, 0) }
              : b,
          ),
        );
      }
      if (next.type === "expense") {
        setBudgets((bs) =>
          bs.map((b) =>
            b.category === next.category
              ? { ...b, spent: (b.spent || 0) + next.amount }
              : b,
          ),
        );
      }

      // 4. Persist to Supabase (delete + insert, since trigger has no UPDATE path).
      if (SUPABASE_READY) {
        import("./api/transactions")
          .then((m) =>
            m.updateTransaction(id, {
              wallet_id: next.wallet_id,
              type: next.type as "income" | "expense",
              amount: next.amount,
              category: next.category,
              description: next.description,
              date: next.date,
            }),
          )
          .then((updated) => {
            // Replace the tx again with the canonical server row (new id).
            setTransactions((prev) =>
              prev.map((t) => (t.id === id ? updated : t)),
            );
          })
          .catch((err) =>
            console.error("[store] updateTransaction failed:", err),
          );
      }
    },
    [],
  );

  // We need the latest transactions to look up the tx being deleted without
  // putting the lookup inside a setState updater (React StrictMode would call
  // the updater twice in dev, double-firing every side effect inside).
  const transactionsRef = useRef(transactions);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  const deleteTransaction = useCallback((id: string) => {
    const tx = transactionsRef.current.find((t) => t.id === id);
    if (!tx) return;

    // 1. Drop the tx from the list — this updater is pure, safe under StrictMode.
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // 2. Mirror the SQL trigger's reversal locally so the UI stays in sync.
    //    These setState calls are at the TOP level — React only calls each
    //    updater function once per real invocation.
    if (tx.type === "transfer" && tx.transfer_to_wallet_id) {
      const destId = tx.transfer_to_wallet_id;
      setWallets((ws) =>
        ws.map((w) => {
          if (w.id === tx.wallet_id) return { ...w, balance: w.balance + tx.amount };
          if (w.id === destId) return { ...w, balance: w.balance - tx.amount };
          return w;
        }),
      );
    } else if (tx.goal_id) {
      const goalId = tx.goal_id;
      setWallets((ws) =>
        ws.map((w) => (w.id === tx.wallet_id ? { ...w, balance: w.balance + tx.amount } : w)),
      );
      setGoals((gs) =>
        gs.map((g) =>
          g.id === goalId ? { ...g, current_amount: Math.max(g.current_amount - tx.amount, 0) } : g,
        ),
      );
    } else {
      const delta = tx.type === "income" ? -tx.amount : tx.amount;
      setWallets((ws) =>
        ws.map((w) => (w.id === tx.wallet_id ? { ...w, balance: w.balance + delta } : w)),
      );
      if (tx.type === "expense") {
        setBudgets((bs) =>
          bs.map((b) =>
            b.category === tx.category
              ? { ...b, spent: Math.max((b.spent || 0) - tx.amount, 0) }
              : b,
          ),
        );
      }
    }

    // 3. Persist to Supabase — the SQL trigger handles reversal there too.
    if (SUPABASE_READY) {
      import("./api/transactions")
        .then((m) => m.deleteTransaction(id))
        .catch((err) =>
          console.error("[store] deleteTransaction failed:", err),
        );
    }
  }, []);

  const addBudget = useCallback((b: Omit<Budget, "id" | "user_id">) => {
    const tempId = makeId();
    setBudgets((prev) => [...prev, { ...b, id: tempId, user_id: "u1" }]);

    if (SUPABASE_READY) {
      import("./api/budgets")
        .then((m) =>
          m.createBudget({
            category: b.category,
            limit_amount: b.limit_amount,
            month_year: b.month_year,
          }),
        )
        .then((created) => {
          setBudgets((prev) =>
            prev.map((budget) => (budget.id === tempId ? created : budget)),
          );
        })
        .catch((err) => console.error("[store] addBudget failed:", err));
    }
  }, []);

  const updateBudget = useCallback((id: string, patch: Partial<Budget>) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );

    if (SUPABASE_READY) {
      import("./api/budgets")
        .then((m) =>
          m.updateBudget(id, {
            category: patch.category,
            limit_amount: patch.limit_amount,
          }),
        )
        .catch((err) => console.error("[store] updateBudget failed:", err));
    }
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));

    if (SUPABASE_READY) {
      import("./api/budgets")
        .then((m) => m.deleteBudget(id))
        .catch((err) => console.error("[store] deleteBudget failed:", err));
    }
  }, []);

  const addGoal = useCallback((g: Omit<Goal, "id" | "user_id">) => {
    const tempId = makeId();
    setGoals((prev) => [...prev, { ...g, id: tempId, user_id: "u1" }]);

    if (SUPABASE_READY) {
      import("./api/goals")
        .then((m) =>
          m.createGoal({
            goal_name: g.goal_name,
            target_amount: g.target_amount,
            current_amount: g.current_amount,
            deadline: g.deadline,
          }),
        )
        .then((created) => {
          setGoals((prev) =>
            prev.map((goal) => (goal.id === tempId ? created : goal)),
          );
        })
        .catch((err) => console.error("[store] addGoal failed:", err));
    }
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

    if (SUPABASE_READY) {
      import("./api/goals")
        .then((m) => m.updateGoal(id, patch))
        .catch((err) => console.error("[store] updateGoal failed:", err));
    }
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));

    if (SUPABASE_READY) {
      import("./api/goals")
        .then((m) => m.deleteGoal(id))
        .catch((err) => console.error("[store] deleteGoal failed:", err));
    }
  }, []);

  const addGoalContribution = useCallback(
    (goalId: string, walletId: string, amount: number, note?: string) => {
      let goalName = "Goal";
      setGoals((prev) => {
        const goal = prev.find((g) => g.id === goalId);
        if (goal) goalName = goal.goal_name;
        return prev.map((g) =>
          g.id === goalId
            ? { ...g, current_amount: g.current_amount + amount }
            : g,
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
        prev.map((w) =>
          w.id === walletId ? { ...w, balance: w.balance - amount } : w,
        ),
      );

      if (SUPABASE_READY) {
        import("./api/goals")
          .then((m) =>
            m.contributeToGoal({
              goal_id: goalId,
              wallet_id: walletId,
              amount,
              note,
            }),
          )
          .catch((err) =>
            console.error("[store] addGoalContribution failed:", err),
          );
      }
    },
    [],
  );

  return (
    <StoreContext.Provider
      value={{
        isHydrating,
        profile,
        wallets,
        transactions,
        budgets,
        goals,
        categories,
        addWallet,
        updateWallet,
        deleteWallet,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBudget,
        updateBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        deleteGoal,
        addGoalContribution,
        addTransfer,
        addCategory,
        updateCategory,
        deleteCategory,
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
