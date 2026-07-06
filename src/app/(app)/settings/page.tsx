"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trash2, LogOut, Loader2, Check, Camera,
  ChevronRight, Upload, Download, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { LOCALE_LABELS, Locale } from "@/lib/i18n/translations";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";

const emptySubscribe = () => () => {};

/** Small segmented control used for theme & language. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors",
            value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A settings row: label + description on the left, a control on the right. */
function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

async function doSignOut() {
  try {
    const { signOut } = await import("@/lib/api/auth");
    await signOut();
  } catch {
    window.location.href = "/login";
  }
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const { profile: storeProfile, updateProfile, isHydrating } = useStore();
  const { showFreedom, setShowFreedom } = usePreferences();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [profile, setProfile] = useState({
    fullName: storeProfile?.full_name || "",
    email: storeProfile?.email || "",
    phone: storeProfile?.phone || "",
  });

  const [syncedProfile, setSyncedProfile] = useState(storeProfile);
  if (storeProfile !== syncedProfile) {
    setSyncedProfile(storeProfile);
    if (storeProfile) {
      setProfile({
        fullName: storeProfile.full_name,
        email: storeProfile.email,
        phone: storeProfile.phone || "",
      });
    }
  }

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoState, setPhotoState] = useState<"idle" | "uploading" | "error">("idle");
  const [photoError, setPhotoError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [prefs, setPrefs] = useState({ notifications: true, budgetAlerts: true, weeklyReport: false });

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError(t("settings.photoInvalid"));
      setPhotoState("error");
      setTimeout(() => setPhotoState("idle"), 4000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError(t("settings.photoTooBig"));
      setPhotoState("error");
      setTimeout(() => setPhotoState("idle"), 4000);
      return;
    }
    setPhotoState("uploading");
    try {
      const sb = getSupabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar_url: publicUrl });
      setPhotoState("idle");
    } catch (err) {
      console.error("[settings] avatar upload failed:", err);
      setPhotoError(t("settings.photoError"));
      setPhotoState("error");
      setTimeout(() => setPhotoState("idle"), 4000);
    }
  }

  async function handleSaveProfile() {
    setSaveState("saving");
    try {
      await updateProfile({ full_name: profile.fullName, phone: profile.phone || null });
      setSaveState("saved");
      setEditingProfile(false);
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 4000);
    }
  }

  const initials = profile.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("settings.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ── LEFT column ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Profil */}
          <Card className="border-border/50 p-5 space-y-4">
            <p className="text-sm font-semibold">{t("settings.tab.profile")}</p>
            {isHydrating && !storeProfile ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-12 w-12">
                    {storeProfile?.avatar_url && <AvatarImage src={storeProfile.avatar_url} alt={profile.fullName} />}
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{profile.fullName}</p>
                    <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingProfile((v) => !v)}>
                    {t("settings.editProfile")}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={photoState === "uploading" || !isSupabaseConfigured()}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoState === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{t("settings.changePhoto")}</span>
                  </Button>
                </div>
              </div>
            )}
            {photoState === "error" && <p className="text-[11px] text-destructive">{photoError}</p>}

            {editingProfile && (
              <div className="space-y-3 pt-3 border-t border-border/50">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("settings.fullName")}</Label>
                    <Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("settings.phone")}</Label>
                    <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  {saveState === "saved" && (
                    <span className="flex items-center gap-1 text-xs text-positive"><Check className="h-3.5 w-3.5" /> {t("settings.saved")}</span>
                  )}
                  {saveState === "error" && <span className="text-xs text-destructive">{t("settings.saveError")}</span>}
                  <Button size="sm" onClick={handleSaveProfile} disabled={saveState === "saving"}>
                    {saveState === "saving" ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> {t("settings.saving")}</> : t("settings.saveChanges")}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Tampilan */}
          <Card className="border-border/50 p-5">
            <p className="text-sm font-semibold">{t("settings.tab.appearance")}</p>
            <div className="divide-y divide-border/50">
              <Row title={t("settings.theme")} desc={t("settings.themeShortDesc")}>
                {mounted && (
                  <Segmented
                    value={(theme as string) || "system"}
                    onChange={setTheme}
                    options={[
                      { value: "light", label: t("settings.theme.light") },
                      { value: "dark", label: t("settings.theme.dark") },
                      { value: "system", label: t("settings.theme.system") },
                    ]}
                  />
                )}
              </Row>
              <Row title={t("settings.language")} desc={t("settings.langShortDesc")}>
                <Segmented
                  value={locale}
                  onChange={(v) => setLocale(v as Locale)}
                  options={(Object.entries(LOCALE_LABELS) as [Locale, { label: string }][]).map(([code, info]) => ({
                    value: code,
                    label: info.label,
                  }))}
                />
              </Row>
              <Row title={t("settings.showFreedom")} desc={t("settings.showFreedomDesc")}>
                <Switch checked={showFreedom} onCheckedChange={setShowFreedom} />
              </Row>
            </div>
          </Card>

          {/* Akun */}
          <Card className="border-border/50 p-0 overflow-hidden">
            <p className="text-sm font-semibold px-5 pt-4 pb-1">{t("settings.account")}</p>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors border-t border-border/50"
            >
              <span className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4 text-muted-foreground" /> {t("settings.changePassword")}</span>
              <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", showPassword && "rotate-90")} />
            </button>
            {showPassword && (
              <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
                <ChangePasswordForm />
              </div>
            )}
            <button
              type="button"
              onClick={doSignOut}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-destructive/10 transition-colors border-t border-border/50 text-destructive"
            >
              <span className="flex items-center gap-2 text-sm font-medium">{t("nav.logout")}</span>
              <LogOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={doSignOut}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors border-t border-border/50"
            >
              <span className="text-sm">{t("settings.logoutAll")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* ── RIGHT column ────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Data */}
          <Card className="border-border/50 p-0 overflow-hidden">
            <p className="text-sm font-semibold px-5 pt-4 pb-1">{t("settings.dataSection")}</p>
            <Link href="/import" className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors border-t border-border/50">
              <span className="flex items-start gap-3">
                <Upload className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{t("settings.importRow")}</span>
                  <span className="block text-xs text-muted-foreground">{t("settings.importRowDesc")}</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
            <Link href="/insight" className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors border-t border-border/50">
              <span className="flex items-start gap-3">
                <Download className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{t("settings.exportRow")}</span>
                  <span className="block text-xs text-muted-foreground">{t("settings.exportRowDesc")}</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </Card>

          {/* Tentang CallFin */}
          <Card className="border-border/50 p-5 space-y-1.5">
            <p className="text-sm font-semibold">{t("settings.aboutTitle")}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("settings.aboutDesc")}</p>
          </Card>

          {/* Notifikasi */}
          <Card className="border-border/50 p-5">
            <p className="text-sm font-semibold">{t("settings.notifSection")}</p>
            <div className="divide-y divide-border/50">
              {[
                { key: "notifications", label: t("settings.notif.push"), desc: t("settings.notif.pushDesc") },
                { key: "budgetAlerts", label: t("settings.notif.budget"), desc: t("settings.notif.budgetDesc") },
                { key: "weeklyReport", label: t("settings.notif.weekly"), desc: t("settings.notif.weeklyDesc") },
              ].map((p) => (
                <Row key={p.key} title={p.label} desc={p.desc}>
                  <Switch
                    checked={prefs[p.key as keyof typeof prefs]}
                    onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
                  />
                </Row>
              ))}
            </div>
          </Card>

          {/* Zona berbahaya */}
          <Card className="border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm font-semibold text-destructive mb-3">{t("settings.dangerZone")}</p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t("settings.deleteAccount")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.dangerZoneDesc")}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 shrink-0">
                <Trash2 className="h-4 w-4" /> {t("settings.deleteAccount")}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
