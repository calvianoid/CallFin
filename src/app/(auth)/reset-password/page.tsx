"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

// "verifying" while the browser client exchanges the recovery code from the URL,
// "ready" once a recovery session exists, "invalid" if no session could be set.
type LinkState = "verifying" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [linkState, setLinkState] = useState<LinkState>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // On mount the browser client auto-detects the recovery code/token in the URL
  // (detectSessionInUrl) and exchanges it. We wait for the resulting session.
  useEffect(() => {
    const sb = getSupabaseBrowser();
    let settled = false;

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        settled = true;
        setLinkState("ready");
      }
    });

    // Fallback: the exchange may have completed before our listener attached.
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setLinkState("ready");
      } else {
        // Give detectSessionInUrl a moment to finish, then mark invalid.
        setTimeout(() => {
          if (!settled) setLinkState("invalid");
        }, 2500);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const sb = getSupabaseBrowser();
      const { error: updErr } = await sb.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      // Force a fresh sign-in with the new password.
      await sb.auth.signOut();
      router.push("/login?reset=success");
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
          <CardTitle className="text-2xl">{t("auth.resetTitle")}</CardTitle>
          <CardDescription className="mt-1">{t("auth.resetSubtitle")}</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {linkState === "verifying" && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        )}

        {linkState === "invalid" && (
          <div className="flex items-start gap-3 bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <span>{t("auth.resetSessionInvalid")}</span>
          </div>
        )}

        {linkState === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">{t("auth.newPasswordLabel")}</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirm">{t("auth.confirmNewPasswordLabel")}</label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.updatePasswordBtn")}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center pt-0">
        <Link
          href={linkState === "invalid" ? "/forgot-password" : "/login"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {linkState === "invalid" ? t("auth.sendResetLink") : t("auth.backToLogin")}
        </Link>
      </CardFooter>
    </Card>
  );
}
