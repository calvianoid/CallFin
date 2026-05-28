"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, User, Bell, Shield, LogOut, Sun, Moon, Monitor, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { LOCALE_LABELS, Locale } from "@/lib/i18n/translations";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const { profile: storeProfile, updateProfile } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Local form state mirrors the store profile so user can edit before saving.
  const [profile, setProfile] = useState({
    fullName: storeProfile?.full_name || "",
    email: storeProfile?.email || "",
    phone: storeProfile?.phone || "",
  });

  // Sync when store profile loads/changes (e.g. after Supabase hydration)
  useEffect(() => {
    if (storeProfile) {
      setProfile({
        fullName: storeProfile.full_name,
        email: storeProfile.email,
        phone: storeProfile.phone || "",
      });
    }
  }, [storeProfile]);

  function handleSaveProfile() {
    // Email is intentionally NOT in this payload — changing the auth email is a
    // separate, verification-gated flow (see Supabase sb.auth.updateUser({email})).
    updateProfile({
      full_name: profile.fullName,
      phone: profile.phone || null,
    });
  }

  const [prefs, setPrefs] = useState({
    notifications: true,
    budgetAlerts: true,
    weeklyReport: false,
  });

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">{t("settings.title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max">
            <TabsTrigger value="profile" className="gap-1"><User className="h-3.5 w-3.5" /> {t("settings.tab.profile")}</TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1"><Sun className="h-3.5 w-3.5" /> {t("settings.tab.appearance")}</TabsTrigger>
            <TabsTrigger value="language" className="gap-1"><Languages className="h-3.5 w-3.5" /> {t("settings.tab.language")}</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell className="h-3.5 w-3.5" /> {t("settings.tab.notifications")}</TabsTrigger>
            <TabsTrigger value="security" className="gap-1"><Shield className="h-3.5 w-3.5" /> {t("settings.tab.security")}</TabsTrigger>
          </TabsList>
        </div>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{t("settings.personalInfo")}</CardTitle>
              <CardDescription>{t("settings.personalInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                    {profile.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{profile.fullName}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">{t("settings.changePhoto")}</Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("settings.fullName")}</Label>
                  <Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.email")}</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    title="Email akun tidak bisa diubah di sini. Hubungi support."
                  />
                  <p className="text-[10px] text-muted-foreground">Email akun adalah identitas login & tidak bisa diubah di sini.</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("settings.phone")}</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveProfile}>{t("settings.saveChanges")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("settings.manageWallets")}</CardTitle>
              <CardDescription>{t("settings.manageWalletsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/wallets"
                className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium border border-border bg-background hover:bg-muted transition-colors"
              >
                {t("settings.goToWallets")}
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{t("settings.theme")}</CardTitle>
              <CardDescription>{t("settings.themeDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "light", label: t("settings.theme.light"), icon: Sun },
                  { value: "dark", label: t("settings.theme.dark"), icon: Moon },
                  { value: "system", label: t("settings.theme.system"), icon: Monitor },
                ].map(({ value, label, icon: Icon }) => {
                  const active = mounted && theme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors",
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-medium", active && "text-primary")}>{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {mounted
                  ? theme === "system"
                    ? t("settings.themeFollow", { now: isDark ? t("settings.now.dark") : t("settings.now.light") })
                    : t("settings.themeNow", { now: theme === "dark" ? t("settings.now.dark") : t("settings.now.light") })
                  : t("common.loading")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{t("settings.quickPreview")}</CardTitle>
              <CardDescription>{t("settings.quickPreviewDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">Secondary</Button>
                <Button size="sm" variant="outline">Outline</Button>
                <Button size="sm" variant="ghost">Ghost</Button>
                <Button size="sm" variant="destructive">Destructive</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Language */}
        <TabsContent value="language" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{t("settings.language")}</CardTitle>
              <CardDescription>{t("settings.languageDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(LOCALE_LABELS) as [Locale, { label: string; flag: string }][]).map(([code, info]) => {
                  const active = locale === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLocale(code)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left",
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
                      )}
                    >
                      <span className="text-2xl">{info.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold", active && "text-primary")}>{info.label}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{code}</p>
                      </div>
                      {active && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{t("settings.notifPrefs")}</CardTitle>
              <CardDescription>{t("settings.notifPrefsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "notifications", label: t("settings.notif.push"), desc: t("settings.notif.pushDesc") },
                { key: "budgetAlerts", label: t("settings.notif.budget"), desc: t("settings.notif.budgetDesc") },
                { key: "weeklyReport", label: t("settings.notif.weekly"), desc: t("settings.notif.weeklyDesc") },
              ].map((p) => (
                <div key={p.key} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  <Switch
                    checked={prefs[p.key as keyof typeof prefs]}
                    onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{t("settings.changePassword")}</CardTitle>
              <CardDescription>{t("settings.changePasswordDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>{t("settings.oldPassword")}</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.newPassword")}</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.confirmPassword")}</Label>
                <Input type="password" />
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm">{t("settings.updatePassword")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">{t("settings.dangerZone")}</CardTitle>
              <CardDescription>{t("settings.dangerZoneDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 w-full justify-start">
                <LogOut className="h-4 w-4" /> {t("settings.logoutAll")}
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 w-full justify-start">
                <Trash2 className="h-4 w-4" /> {t("settings.deleteAccount")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
