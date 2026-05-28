"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { WalletDialog } from "@/components/forms/WalletDialog";
import { GoalDialog } from "@/components/forms/GoalDialog";
import { BudgetDialog } from "@/components/forms/BudgetDialog";
import {
  Sparkles, Wallet as WalletIcon, Target, PieChart, MessageSquare,
  CheckCircle2, ArrowRight, SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDED_KEY = "callfin.onboarded";

interface Step {
  icon: typeof WalletIcon;
  title: string;
  description: string;
  ctaLabel: string;
  done: (store: ReturnType<typeof useStore>) => boolean;
}

const STEPS: Step[] = [
  {
    icon: WalletIcon,
    title: "Tambah Dompet Bank / E-Wallet",
    description: "Selain Tunai yang udah kamu punya, tambah dompet lain (BCA, GoPay, OVO, dsb) biar AI bisa track aliran dana di tiap dompet.",
    ctaLabel: "Tambah Dompet",
    done: (s) => s.wallets.length > 1,
  },
  {
    icon: Target,
    title: "Tetapkan Goal Pertama",
    description: "Misal: Dana darurat 10 juta, beli laptop, atau liburan. AI akan bantu pantau progress-nya.",
    ctaLabel: "Tetapkan Goal",
    done: (s) => s.goals.length > 0,
  },
  {
    icon: PieChart,
    title: "Atur Budget Pengeluaran",
    description: "Batasi pengeluaran per kategori (Makanan, Hiburan, dst). AI ngingatin pas budget hampir habis.",
    ctaLabel: "Atur Budget",
    done: (s) => s.budgets.length > 0,
  },
];

export function WelcomeOnboarding() {
  const store = useStore();
  const { profile } = store;
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  // Show only once per user, only when they actually have an empty state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(ONBOARDED_KEY);
    if (seen) return;
    // Only show when user has minimal data (likely new account)
    // Wait a tick for store hydration
    const t = setTimeout(() => {
      const isNew = store.wallets.length <= 1 && store.transactions.length === 0 && store.goals.length === 0;
      if (isNew) setOpen(true);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDED_KEY, new Date().toISOString());
    }
    setOpen(false);
  }

  function next() {
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
    else dismiss();
  }

  function handleStepCTA() {
    if (stepIdx === 0) setWalletDialogOpen(true);
    else if (stepIdx === 1) setGoalDialogOpen(true);
    else if (stepIdx === 2) setBudgetDialogOpen(true);
  }

  const currentStep = STEPS[stepIdx];
  const stepDone = currentStep?.done(store);
  const displayName = profile?.full_name?.split(" ")[0] || "kamu";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-3">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              {stepIdx === 0 ? `Selamat datang, ${displayName}! 👋` : currentStep.title}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              {stepIdx === 0
                ? "Yuk setup CallFin biar bisa langsung kepake. 3 langkah cepat — atau skip kalau mau eksplor sendiri."
                : currentStep.description}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 py-2">
            {STEPS.map((s, i) => {
              const done = s.done(store);
              const isCurrent = i === stepIdx;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                      done
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("w-6 h-0.5", done ? "bg-green-500" : "bg-muted")} />
                  )}
                </div>
              );
            })}
          </div>

          {stepIdx === 0 ? (
            <div className="bg-muted rounded-xl p-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p><strong>Chat AI</strong> — Ngomong aja ke AI: &quot;Makan siang 50rb pakai GoPay&quot;, otomatis dicatat.</p>
              </div>
              <div className="flex items-start gap-3">
                <WalletIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p><strong>Multi-dompet</strong> — Track tunai, bank, e-wallet, kartu kredit dalam 1 app.</p>
              </div>
              <div className="flex items-start gap-3">
                <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p><strong>Goals & Budget</strong> — Tetapkan target, AI bantu pantau biar gak lewat batas.</p>
              </div>
            </div>
          ) : (
            <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                stepDone ? "bg-green-100" : "bg-primary/10"
              )}>
                {stepDone ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <currentStep.icon className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="text-sm">
                {stepDone ? (
                  <>
                    <p className="font-semibold text-green-700 dark:text-green-400">✓ Selesai!</p>
                    <p className="text-xs text-muted-foreground">Lanjut ke step berikutnya.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Belum dilakukan</p>
                    <p className="text-xs text-muted-foreground">Klik tombol di bawah untuk mulai.</p>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {stepIdx === 0 ? (
              <>
                <Button variant="outline" onClick={dismiss} className="gap-1">
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </Button>
                <Button onClick={() => setStepIdx(1)} className="gap-1">
                  Mulai Setup <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={dismiss} className="gap-1 text-muted-foreground">
                  <SkipForward className="h-3.5 w-3.5" /> Skip semua
                </Button>
                {!stepDone && (
                  <Button variant="outline" onClick={handleStepCTA} className="gap-1">
                    <currentStep.icon className="h-3.5 w-3.5" /> {currentStep.ctaLabel}
                  </Button>
                )}
                <Button onClick={next} className="gap-1">
                  {stepIdx < STEPS.length - 1 ? (
                    <>Lanjut <ArrowRight className="h-3.5 w-3.5" /></>
                  ) : (
                    <>Selesai <CheckCircle2 className="h-3.5 w-3.5" /></>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WalletDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
      <GoalDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} />
      <BudgetDialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen} />
    </>
  );
}
