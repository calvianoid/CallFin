"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2, MailCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  // After register with email-confirmation-required, register page redirects
  // here with ?confirm=<email> — show a friendly hint instead of an error.
  // These come straight from the URL, so they're derived at render (email is
  // just seeded once via the state initializer, still editable after).
  const confirmEmail = searchParams.get("confirm");
  const [email, setEmail] = useState(confirmEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const info = confirmEmail
    ? t("auth.signInConfirmed", { email: confirmEmail })
    : searchParams.get("reset") === "success"
      ? t("auth.resetSuccess")
      : "";
  const urlError =
    !info && searchParams.get("error") === "callback" ? t("auth.callbackError") : "";
  const error = submitError || urlError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");

    try {
      // Try real Supabase auth via server action. If not configured, it'll throw
      // and we fall back to the demo flow (lands on dashboard with mock data).
      const { signIn } = await import("@/lib/api/auth");
      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      const res = await signIn(fd);
      if (res && "error" in res && res.error) {
        setSubmitError(res.error);
        return;
      }
      // signIn redirects to / on success — fallback router push if not configured
      router.push("/");
    } catch {
      // Supabase not configured → demo passthrough
      await new Promise((r) => setTimeout(r, 400));
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
          <CardTitle className="text-2xl">{t("auth.signInTitle")}</CardTitle>
          <CardDescription className="mt-1">
            {t("auth.signInSubtitle")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {info && !error && (
            <div className="flex items-start gap-2 bg-primary/10 text-primary text-sm rounded-lg px-3 py-2">
              <MailCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{info}</span>
            </div>
          )}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">{t("auth.email")}</label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="password">{t("auth.password")}</label>
              <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signIn")}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center pt-0">
        <p className="text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            {t("auth.signUpNow")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
