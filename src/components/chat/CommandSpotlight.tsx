"use client";

/**
 * Revamp: command bar bergaya "spotlight" (artboard 5Q) —
 * input di atas, hasil parse langsung jadi kartu konfirmasi di bawahnya,
 * plus chip saran. Memakai parser lokal (deterministik, instan, jalan tanpa
 * API) + kartu & dialog konfirmasi yang sudah ada.
 */

import { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import {
  parseTransaction,
  parseTransfer,
  parseGoalContribution,
  answerQuery,
  isQuestion,
  type ParsedTransfer,
  type ParsedGoalContribution,
} from "@/lib/chat-ai";
import { ParsedTransaction } from "@/types";
import { ChatConfirmCard } from "./ChatConfirmCard";
import { ChatConfirmTransferCard } from "./ChatConfirmTransferCard";
import { ChatConfirmGoalCard } from "./ChatConfirmGoalCard";
import { TransactionDialog } from "@/components/forms/TransactionDialog";
import { TransferDialog } from "@/components/forms/TransferDialog";
import { GoalContributionDialog } from "@/components/forms/GoalContributionDialog";

type Result =
  | { kind: "confirm"; parsed: ParsedTransaction }
  | { kind: "transfer"; parsed: ParsedTransfer }
  | { kind: "goal"; parsed: ParsedGoalContribution }
  | { kind: "text"; text: string }
  | null;

export function CommandSpotlight() {
  const { wallets, goals, categories, transactions, budgets, addTransaction, addTransfer, addGoalContribution } = useStore();
  const { t, locale } = useTranslation();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [done, setDone] = useState(false);
  const [txEdit, setTxEdit] = useState<Partial<ParsedTransaction> | null>(null);
  const [transferEdit, setTransferEdit] = useState<ParsedTransfer | null>(null);
  const [goalEdit, setGoalEdit] = useState<ParsedGoalContribution | null>(null);

  function reset() {
    setResult(null);
    setInput("");
  }

  function flashDone() {
    setDone(true);
    setTimeout(() => {
      setDone(false);
      reset();
    }, 1300);
  }

  function submit(text: string) {
    const q = text.trim();
    if (!q) return;
    const walletNames = wallets.map((w) => ({ id: w.id, name: w.name }));
    const cats = categories.filter((c) => !c.isInternal).map((c) => ({ name: c.name, type: c.type }));

    if (isQuestion(q)) {
      setResult({ kind: "text", text: answerQuery(q, { transactions, wallets, budgets, goals }, locale) });
      return;
    }
    const transfer = parseTransfer(q, walletNames);
    if (transfer) return setResult({ kind: "transfer", parsed: transfer });
    const goal = parseGoalContribution(q, goals, walletNames);
    if (goal) return setResult({ kind: "goal", parsed: goal });
    const tx = parseTransaction(q, walletNames, cats);
    if (tx) return setResult({ kind: "confirm", parsed: tx });
    setResult({ kind: "text", text: answerQuery(q, { transactions, wallets, budgets, goals }, locale) });
  }

  const suggestions = [t("commandbar.suggest1"), t("commandbar.suggest2"), t("commandbar.suggest3")];

  return (
    <div className="flex flex-col">
      {/* Input row */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder={t("commandbar.placeholder")}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 py-0.5 font-num text-[10px] text-muted-foreground">
          ESC
        </kbd>
      </div>

      {/* Result / suggestions */}
      <div className="p-4">
        {done ? (
          <div className="flex items-center gap-2 text-sm text-positive py-6 justify-center">
            <CheckCircle2 className="h-5 w-5" /> {t("commandbar.done")}
          </div>
        ) : result?.kind === "confirm" ? (
          <ChatConfirmCard
            parsed={result.parsed}
            wallet={wallets.find((w) => w.id === result.parsed.wallet_id)}
            onConfirm={() => {
              addTransaction({
                type: result.parsed.type,
                amount: result.parsed.amount,
                category: result.parsed.category,
                description: result.parsed.description,
                date: result.parsed.date,
                wallet_id: result.parsed.wallet_id ?? wallets[0]?.id,
              });
              flashDone();
            }}
            onEdit={() => setTxEdit(result.parsed)}
            onCancel={reset}
          />
        ) : result?.kind === "transfer" ? (
          <ChatConfirmTransferCard
            parsed={result.parsed}
            fromWallet={wallets.find((w) => w.id === result.parsed.from_wallet_id)}
            toWallet={wallets.find((w) => w.id === result.parsed.to_wallet_id)}
            onConfirm={() => {
              addTransfer(result.parsed.from_wallet_id, result.parsed.to_wallet_id, result.parsed.amount);
              flashDone();
            }}
            onEdit={() => setTransferEdit(result.parsed)}
            onCancel={reset}
          />
        ) : result?.kind === "goal" ? (
          <ChatConfirmGoalCard
            parsed={result.parsed}
            wallet={wallets.find((w) => w.id === result.parsed.wallet_id)}
            goal={goals.find((g) => g.id === result.parsed.goal_id)}
            onConfirm={() => {
              addGoalContribution(result.parsed.goal_id, result.parsed.wallet_id, result.parsed.amount);
              flashDone();
            }}
            onEdit={() => setGoalEdit(result.parsed)}
            onCancel={reset}
          />
        ) : result?.kind === "text" ? (
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.text}</div>
        ) : (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2.5">
              {t("commandbar.usualNow")}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setInput(s);
                    submit(s);
                  }}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit-manual dialogs (prefilled) */}
      <TransactionDialog
        open={!!txEdit}
        onOpenChange={(o) => {
          if (!o) {
            setTxEdit(null);
            reset();
          }
        }}
        initial={txEdit ?? undefined}
      />
      <TransferDialog
        open={!!transferEdit}
        onOpenChange={(o) => {
          if (!o) {
            setTransferEdit(null);
            reset();
          }
        }}
        defaultFromId={transferEdit?.from_wallet_id}
        defaultToId={transferEdit?.to_wallet_id}
        defaultAmount={transferEdit?.amount}
      />
      <GoalContributionDialog
        open={!!goalEdit}
        onOpenChange={(o) => {
          if (!o) {
            setGoalEdit(null);
            reset();
          }
        }}
        goalId={goalEdit?.goal_id}
        defaultAmount={goalEdit?.amount}
        defaultWalletId={goalEdit?.wallet_id}
      />
    </div>
  );
}
