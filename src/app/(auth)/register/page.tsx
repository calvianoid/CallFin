"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";

const STEP_KEYS: TranslationKey[] = ["register.step.account", "register.step.profile", "register.step.budget"];

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const steps = STEP_KEYS.map((k) => t(k));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    monthly_income: "",
    primary_goal: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const [error, setError] = useState("");

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { signUp } = await import("@/lib/api/auth");
      const fd = new FormData();
      fd.set("email", form.email);
      fd.set("password", form.password);
      fd.set("fullName", form.full_name);
      const res = await signUp(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      if (res && "pendingConfirmation" in res && res.pendingConfirmation) {
        // Supabase requires email confirmation — send user to login with hint
        router.push(`/login?confirm=${encodeURIComponent(form.email)}`);
        return;
      }
      router.push("/");
    } catch {
      // Supabase not configured → demo passthrough
      await new Promise((r) => setTimeout(r, 500));
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-border/50">
      <CardHeader className="space-y-3 text-center pb-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-2 bg-primary/10 rounded-2xl px-4 py-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-primary">CallFin</span>
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl">{t("auth.createTitle")}</CardTitle>
          <CardDescription>{t("auth.createSubtitle")}</CardDescription>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{steps[step]}</p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleNext} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("auth.email")}</label>
                <Input type="email" placeholder={t("auth.emailPlaceholder")} value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("auth.password")}</label>
                <Input type="password" placeholder={t("register.passwordPlaceholder")} value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} />
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("auth.fullName")}</label>
              <Input placeholder={t("register.namePlaceholder")} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required />
            </div>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("auth.monthlyIncome")}</label>
                <CurrencyInput placeholder="10.000.000" value={form.monthly_income} onValueChange={(v) => update("monthly_income", v)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("auth.primaryGoal")}</label>
                <Input placeholder={t("register.goalPlaceholder")} value={form.primary_goal} onChange={(e) => update("primary_goal", e.target.value)} />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
             step < steps.length - 1 ? t("auth.next") : t("auth.startNow")}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center pt-0">
        <p className="text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
