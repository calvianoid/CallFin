"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { ChatConfirmCard } from "./ChatConfirmCard";
import { ChatConfirmGoalCard } from "./ChatConfirmGoalCard";
import { ChatConfirmTransferCard } from "./ChatConfirmTransferCard";
import { TransferDialog } from "@/components/forms/TransferDialog";
import { TransactionDialog } from "@/components/forms/TransactionDialog";
import { Send, Sparkles, Plus } from "lucide-react";
import { ParsedTransaction } from "@/types";
import { useStore } from "@/lib/store";
import { parseTransaction, parseGoalContribution, parseTransfer, answerQuery, isQuestion, ParsedGoalContribution, ParsedTransfer } from "@/lib/chat-ai";
import { GoalContributionDialog } from "@/components/forms/GoalContributionDialog";
import { useTranslation } from "@/lib/i18n/context";

type Message =
  | { id: string; kind: "text"; role: "user" | "assistant"; content: string }
  | { id: string; kind: "confirm"; parsed: ParsedTransaction; status: "pending" | "confirmed" | "cancelled" }
  | { id: string; kind: "confirm_goal"; parsed: ParsedGoalContribution; status: "pending" | "confirmed" | "cancelled" }
  | { id: string; kind: "confirm_transfer"; parsed: ParsedTransfer; status: "pending" | "confirmed" | "cancelled" };

const QUICK_PROMPTS = [
  "Makan siang 50 ribu pakai GoPay",
  "Transfer 500 ribu dari BCA ke GoPay",
  "Nabung dana darurat 500 ribu dari BCA",
  "Berapa pengeluaran bulan ini?",
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    kind: "text",
    role: "assistant",
    content:
      "Halo! Saya CallFin AI 👋\n\nSaya bisa membantu:\n\n**1. Mencatat transaksi** (konfirmasi dulu)\n   • \"Makan siang 50 ribu pakai GoPay\"\n   • \"Gaji masuk 10 juta ke BCA\"\n\n**2. Transfer antar dompet**\n   • \"Transfer 500 ribu dari BCA ke GoPay\"\n   • \"Topup GoPay 200rb dari BCA\"\n\n**3. Nabung ke Goal**\n   • \"Nabung dana darurat 500 ribu dari BCA\"\n\n**4. Menjawab pertanyaan**\n   • \"Berapa pengeluaran tanggal 15 Mei?\"\n   • \"Gimana progress goal Liburan Bali?\"",
  },
];

export function ChatInterface() {
  const { wallets, addTransaction, addGoalContribution, addTransfer, transactions, budgets, goals } = useStore();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; parsed?: ParsedTransaction; msgId?: string }>({ open: false });
  const [goalEditDialog, setGoalEditDialog] = useState<{ open: boolean; parsed?: ParsedGoalContribution; msgId?: string }>({ open: false });
  const [transferEditDialog, setTransferEditDialog] = useState<{ open: boolean; parsed?: ParsedTransfer; msgId?: string }>({ open: false });
  const [manualDialog, setManualDialog] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), kind: "text", role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));

    // Questions are answered from real store data — no transaction is recorded.
    if (isQuestion(text)) {
      const reply = answerQuery(text, { transactions, wallets, budgets, goals });
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), kind: "text", role: "assistant", content: reply }]);
      setLoading(false);
      return;
    }

    const walletNames = wallets.map((w) => ({ id: w.id, name: w.name }));

    // 1. Try transfer first (very specific: mentions transfer + 2 wallets)
    const transfer = parseTransfer(text, walletNames);
    if (transfer) {
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), kind: "confirm_transfer", parsed: transfer, status: "pending" }]);
      setLoading(false);
      return;
    }

    // 2. Then goal contribution
    const goalContrib = parseGoalContribution(text, goals, walletNames);
    if (goalContrib) {
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), kind: "confirm_goal", parsed: goalContrib, status: "pending" }]);
      setLoading(false);
      return;
    }

    // 3. Then regular transaction
    const parsed = parseTransaction(text, walletNames);
    if (parsed) {
      // Ask the AI to polish the description (with regex fallback baked into the endpoint).
      // Worst case the network fails — keep the regex-cleaned description from parseTransaction.
      try {
        const wallet = wallets.find((w) => w.id === parsed.wallet_id);
        const res = await fetch("/api/clean-description", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text,
            category: parsed.category,
            type: parsed.type,
            amount: parsed.amount,
            wallet: wallet?.name,
            walletNames: wallets.map((w) => w.name),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.description) parsed.description = data.description;
        }
      } catch {
        // ignore — keep regex-cleaned description
      }
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), kind: "confirm", parsed, status: "pending" }]);
    } else {
      const reply = answerQuery(text, { transactions, wallets, budgets, goals });
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), kind: "text", role: "assistant", content: reply }]);
    }
    setLoading(false);
  }

  function handleConfirmGoal(msgId: string, parsed: ParsedGoalContribution) {
    addGoalContribution(parsed.goal_id, parsed.wallet_id, parsed.amount);

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm_goal" ? { ...m, status: "confirmed" } : m))
    );

    const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parsed.amount);
    const wallet = wallets.find((w) => w.id === parsed.wallet_id);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        kind: "text",
        role: "assistant",
        content: `🐷 Mantap! **${fmt}** dari ${wallet?.icon} **${wallet?.name}** sudah masuk ke goal **${parsed.goal_name}**. Progress goal kamu naik!`,
      },
    ]);
  }

  function handleCancelGoal(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm_goal" ? { ...m, status: "cancelled" } : m))
    );
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), kind: "text", role: "assistant", content: "Oke, setoran ke goal dibatalkan." },
    ]);
  }

  function handleEditGoal(msgId: string, parsed: ParsedGoalContribution) {
    setGoalEditDialog({ open: true, parsed, msgId });
  }

  function handleGoalEditSaved(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm_goal" ? { ...m, status: "confirmed" } : m))
    );
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), kind: "text", role: "assistant", content: "🐷 Setoran ke goal sudah disimpan setelah diubah!" },
    ]);
  }

  function handleConfirmTransfer(msgId: string, parsed: ParsedTransfer) {
    addTransfer(parsed.from_wallet_id, parsed.to_wallet_id, parsed.amount);

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm_transfer" ? { ...m, status: "confirmed" } : m))
    );

    const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parsed.amount);
    const fromW = wallets.find((w) => w.id === parsed.from_wallet_id);
    const toW = wallets.find((w) => w.id === parsed.to_wallet_id);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        kind: "text",
        role: "assistant",
        content: `↔️ Transfer **${fmt}** dari ${fromW?.icon} **${fromW?.name}** ke ${toW?.icon} **${toW?.name}** berhasil. Saldo kedua dompet sudah diupdate.`,
      },
    ]);
  }

  function handleCancelTransfer(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm_transfer" ? { ...m, status: "cancelled" } : m))
    );
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), kind: "text", role: "assistant", content: "Oke, transfer dibatalkan." },
    ]);
  }

  function handleEditTransfer(msgId: string, parsed: ParsedTransfer) {
    setTransferEditDialog({ open: true, parsed, msgId });
  }

  function handleTransferEditSaved(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm_transfer" ? { ...m, status: "confirmed" } : m))
    );
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), kind: "text", role: "assistant", content: "↔️ Transfer sudah disimpan setelah diubah!" },
    ]);
  }

  function handleConfirm(msgId: string, parsed: ParsedTransaction) {
    addTransaction({
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      date: parsed.date,
      wallet_id: parsed.wallet_id || wallets[0].id,
    });

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm" ? { ...m, status: "confirmed" } : m))
    );

    const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parsed.amount);
    const wallet = wallets.find((w) => w.id === parsed.wallet_id);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        kind: "text",
        role: "assistant",
        content: `✅ Tercatat! ${parsed.type === "income" ? "Pemasukan" : "Pengeluaran"} **${fmt}** kategori **${parsed.category}** dari ${wallet?.icon} **${wallet?.name}** sudah disimpan. Dashboard sebelah kanan sudah diperbarui.`,
      },
    ]);
  }

  function handleCancel(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm" ? { ...m, status: "cancelled" } : m))
    );
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        kind: "text",
        role: "assistant",
        content: "Oke, transaksi dibatalkan. Ada yang ingin dicatat lagi?",
      },
    ]);
  }

  function handleEdit(msgId: string, parsed: ParsedTransaction) {
    setEditDialog({ open: true, parsed, msgId });
  }

  function handleEditSaved(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.kind === "confirm" ? { ...m, status: "confirmed" } : m))
    );
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        kind: "text",
        role: "assistant",
        content: "✅ Berhasil! Transaksi sudah disimpan setelah diubah. Dashboard sudah ter-update.",
      },
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary shrink-0">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">CallFin AI</p>
          <p className="text-xs text-muted-foreground truncate">{t("chat.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={() => setManualDialog(true)}>
          <Plus className="h-3 w-3" /> {t("chat.manualBtn")}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2">
          {messages.map((msg) => {
            if (msg.kind === "text") {
              return <ChatMessage key={msg.id} role={msg.role} content={msg.content} />;
            }
            if (msg.kind === "confirm") {
              const wallet = wallets.find((w) => w.id === msg.parsed.wallet_id);
              if (msg.status === "pending") {
                return (
                  <ChatConfirmCard
                    key={msg.id}
                    parsed={msg.parsed}
                    wallet={wallet}
                    onConfirm={() => handleConfirm(msg.id, msg.parsed)}
                    onEdit={() => handleEdit(msg.id, msg.parsed)}
                    onCancel={() => handleCancel(msg.id)}
                  />
                );
              }
              return (
                <ChatMessage
                  key={msg.id}
                  role="assistant"
                  content={msg.status === "confirmed" ? "✅ Transaksi sudah disimpan." : "❌ Transaksi dibatalkan."}
                />
              );
            }
            if (msg.kind === "confirm_goal") {
              const wallet = wallets.find((w) => w.id === msg.parsed.wallet_id);
              const goal = goals.find((g) => g.id === msg.parsed.goal_id);
              if (msg.status === "pending") {
                return (
                  <ChatConfirmGoalCard
                    key={msg.id}
                    parsed={msg.parsed}
                    wallet={wallet}
                    goal={goal}
                    onConfirm={() => handleConfirmGoal(msg.id, msg.parsed)}
                    onEdit={() => handleEditGoal(msg.id, msg.parsed)}
                    onCancel={() => handleCancelGoal(msg.id)}
                  />
                );
              }
              return (
                <ChatMessage
                  key={msg.id}
                  role="assistant"
                  content={msg.status === "confirmed" ? "🐷 Setoran goal disimpan." : "❌ Setoran goal dibatalkan."}
                />
              );
            }
            // confirm_transfer
            const fromW = wallets.find((w) => w.id === msg.parsed.from_wallet_id);
            const toW = wallets.find((w) => w.id === msg.parsed.to_wallet_id);
            if (msg.status === "pending") {
              return (
                <ChatConfirmTransferCard
                  key={msg.id}
                  parsed={msg.parsed}
                  fromWallet={fromW}
                  toWallet={toW}
                  onConfirm={() => handleConfirmTransfer(msg.id, msg.parsed)}
                  onEdit={() => handleEditTransfer(msg.id, msg.parsed)}
                  onCancel={() => handleCancelTransfer(msg.id)}
                />
              );
            }
            return (
              <ChatMessage
                key={msg.id}
                role="assistant"
                content={msg.status === "confirmed" ? "↔️ Transfer disimpan." : "❌ Transfer dibatalkan."}
              />
            );
          })}
          {loading && <ChatMessage role="assistant" content="" isLoading />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Quick prompts */}
      <div className="px-4 pb-2 pt-2 flex gap-2 flex-wrap shrink-0 bg-card border-t border-border/50">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
            className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors border border-border"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 shrink-0 bg-card">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end bg-muted rounded-2xl p-2 border border-border">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0 text-sm p-1.5"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-xl h-9 w-9 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-2">
          {t("chat.hint")}
        </p>
      </div>

      {/* Edit dialog for chat confirmation */}
      <TransactionDialog
        open={editDialog.open}
        onOpenChange={(o) => setEditDialog((d) => ({ ...d, open: o }))}
        initial={editDialog.parsed}
        fromAI
        onSaved={() => editDialog.msgId && handleEditSaved(editDialog.msgId)}
      />

      {/* Manual entry dialog */}
      <TransactionDialog open={manualDialog} onOpenChange={setManualDialog} />

      {/* Goal contribution edit dialog (from chat "Ubah") */}
      <GoalContributionDialog
        open={goalEditDialog.open}
        onOpenChange={(o) => setGoalEditDialog((d) => ({ ...d, open: o }))}
        goalId={goalEditDialog.parsed?.goal_id}
        defaultAmount={goalEditDialog.parsed?.amount}
        defaultWalletId={goalEditDialog.parsed?.wallet_id}
        fromAI
        onSaved={() => goalEditDialog.msgId && handleGoalEditSaved(goalEditDialog.msgId)}
      />

      {/* Transfer edit dialog (from chat "Ubah") */}
      <TransferDialog
        open={transferEditDialog.open}
        onOpenChange={(o) => setTransferEditDialog((d) => ({ ...d, open: o }))}
        defaultFromId={transferEditDialog.parsed?.from_wallet_id}
        defaultToId={transferEditDialog.parsed?.to_wallet_id}
        defaultAmount={transferEditDialog.parsed?.amount}
        fromAI
        onSaved={() => transferEditDialog.msgId && handleTransferEditSaved(transferEditDialog.msgId)}
      />
    </div>
  );
}
