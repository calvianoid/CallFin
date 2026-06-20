"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function ChangePasswordForm() {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError(t("settings.passwordTooShort"));
      return;
    }
    if (newPassword !== confirm) {
      setError(t("settings.passwordMismatch"));
      return;
    }

    setState("saving");
    try {
      const { changePassword } = await import("@/lib/api/auth");
      const fd = new FormData();
      fd.set("oldPassword", oldPassword);
      fd.set("newPassword", newPassword);
      const res = await changePassword(fd);
      if (res && "error" in res && res.error) {
        setError(res.error === "oldPasswordWrong" ? t("settings.oldPasswordWrong") : res.error);
        setState("idle");
        return;
      }
      setState("saved");
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setError(t("settings.passwordSaveError"));
      setState("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="old-password">{t("settings.oldPassword")}</Label>
        <Input
          id="old-password"
          type="password"
          placeholder="••••••••"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t("settings.confirmPassword")}</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        {state === "saved" && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5" /> {t("settings.passwordUpdated")}
          </span>
        )}
        <Button size="sm" type="submit" disabled={state === "saving" || !configured}>
          {state === "saving" ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> {t("settings.updatingPassword")}</>
          ) : (
            t("settings.updatePassword")
          )}
        </Button>
      </div>
    </form>
  );
}
