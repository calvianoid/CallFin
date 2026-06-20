"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Initiate from the browser client so the PKCE code-verifier is stored in
      // THIS browser — /reset-password (a fresh navigation from the email link)
      // then auto-exchanges the code against it. We always show the "sent" state
      // (even on error) to avoid leaking which emails have accounts.
      const sb = getSupabaseBrowser();
      await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSent(true);
    } catch {
      setError(t("common.error"));
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
          <CardTitle className="text-2xl">{t("auth.forgotTitle")}</CardTitle>
          <CardDescription className="mt-1">{t("auth.forgotSubtitle")}</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {sent ? (
          <div className="flex items-start gap-3 bg-primary/10 text-primary text-sm rounded-lg px-4 py-3">
            <MailCheck className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t("auth.resetEmailSentTitle")}</p>
              <p className="mt-1 text-primary/80">{t("auth.resetEmailSent", { email })}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.sendResetLink")}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center pt-0">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("auth.backToLogin")}
        </Link>
      </CardFooter>
    </Card>
  );
}
