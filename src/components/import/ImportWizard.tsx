"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { useStore } from "@/lib/store";
import {
  parseMoneyLoverCsv,
  suggestCategory,
  type ParseResult,
  type NormalizedTx,
} from "@/lib/import/money-lover-parser";
import { CategoryDialog } from "@/components/forms/CategoryDialog";
import { WalletDialog } from "@/components/forms/WalletDialog";
import { formatRupiah } from "@/lib/mock-data";
import {
  Upload, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  Loader2, ArrowLeftRight, TrendingUp, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryType } from "@/types";

type Step = "source" | "upload" | "map" | "review" | "result";

const STEP_TITLES: Record<Step, string> = {
  source: "Sumber",
  upload: "Upload",
  map: "Mapping",
  review: "Review",
  result: "Done",
};

const STEP_ORDER: Step[] = ["source", "upload", "map", "review", "result"];

interface ImportSource {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  fileTypes?: string;
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: "money-lover",
    name: "Money Lover",
    icon: "💰",
    description: "Import dari Money Lover Web (Files → Export → CSV).",
    available: true,
    fileTypes: ".csv",
  },
  {
    id: "spendee",
    name: "Spendee",
    icon: "📊",
    description: "Coming soon — beri tahu kalau ini butuh prioritas.",
    available: false,
  },
  {
    id: "wallet",
    name: "Wallet by BudgetBakers",
    icon: "👛",
    description: "Coming soon.",
    available: false,
  },
  {
    id: "csv-generic",
    name: "CSV Custom",
    icon: "📄",
    description: "Coming soon — mapping kolom manual untuk file CSV apa saja.",
    available: false,
  },
];

export function ImportWizard() {
  const { wallets, categories } = useStore();
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<ImportSource | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Mapping state: raw name → real id/name
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [walletMap, setWalletMap] = useState<Record<string, string>>({});

  const [importing, setImporting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [result, setResult] = useState<{
    total: number;
    inserted: number;
    transferPairs: number;
    failed: { row: number; reason: string }[];
  } | null>(null);

  // Dialogs for inline create
  const [newCategoryFor, setNewCategoryFor] = useState<{ name: string; type: CategoryType } | null>(null);
  const [newWalletFor, setNewWalletFor] = useState<string | null>(null);

  const currentStepIdx = STEP_ORDER.indexOf(step);

  // ──────────────────────────────────────────────────────────────────────────
  // Upload handler
  // ──────────────────────────────────────────────────────────────────────────
  async function handleFile(file: File) {
    setParseError(null);
    try {
      const result = await parseMoneyLoverCsv(file);
      setParsed(result);

      // Pre-fill category map with auto-suggestions
      const cMap: Record<string, string> = {};
      for (const raw of result.uniqueCategories) {
        const suggested = suggestCategory(raw);
        if (suggested && categories.some((c) => c.name === suggested)) {
          cMap[raw] = suggested;
        }
      }
      setCategoryMap(cMap);

      // Pre-fill wallet map for exact matches
      const wMap: Record<string, string> = {};
      for (const raw of result.uniqueWallets) {
        const match = wallets.find((w) => w.name.toLowerCase() === raw.toLowerCase());
        if (match) wMap[raw] = match.id;
      }
      setWalletMap(wMap);

      setStep("map");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Validation: every required mapping must be set before going forward
  // ──────────────────────────────────────────────────────────────────────────
  const allCategoriesMapped = useMemo(() => {
    if (!parsed) return false;
    return parsed.uniqueCategories.every((c) => categoryMap[c] && categoryMap[c] !== "");
  }, [parsed, categoryMap]);

  const allWalletsMapped = useMemo(() => {
    if (!parsed) return false;
    return parsed.uniqueWallets.every((w) => walletMap[w] && walletMap[w] !== "");
  }, [parsed, walletMap]);

  const canReview = allCategoriesMapped && allWalletsMapped;

  // ──────────────────────────────────────────────────────────────────────────
  // Build final import rows
  // ──────────────────────────────────────────────────────────────────────────
  const finalRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.normalized.map((n: NormalizedTx) => ({
      kind: n.kind,
      date: n.date,
      amount: n.amount,
      category: n.kind === "transfer" ? "Transfer" : (categoryMap[n.category] || ""),
      walletId: walletMap[n.wallet] || "",
      toWalletId: n.toWallet ? walletMap[n.toWallet] : undefined,
      description: n.description,
    }));
  }, [parsed, categoryMap, walletMap]);

  // Summary stats
  const summary = useMemo(() => {
    const s = { transfer: 0, income: 0, expense: 0, incomeAmount: 0, expenseAmount: 0, transferAmount: 0 };
    for (const r of finalRows) {
      if (r.kind === "transfer") { s.transfer += 1; s.transferAmount += r.amount; }
      else if (r.kind === "income") { s.income += 1; s.incomeAmount += r.amount; }
      else if (r.kind === "expense") { s.expense += 1; s.expenseAmount += r.amount; }
    }
    return s;
  }, [finalRows]);

  // ──────────────────────────────────────────────────────────────────────────
  // Import
  // ──────────────────────────────────────────────────────────────────────────
  async function doImport() {
    setImporting(true);
    setProgressPct(0);
    try {
      const { importTransactions } = await import("@/lib/api/import");
      // Send in batches of 25 to update progress
      const BATCH = 25;
      const allFailed: { row: number; reason: string }[] = [];
      let inserted = 0;
      let pairs = 0;

      for (let i = 0; i < finalRows.length; i += BATCH) {
        const slice = finalRows.slice(i, i + BATCH);
        const res = await importTransactions(slice);
        inserted += res.inserted;
        pairs += res.transferPairs;
        allFailed.push(...res.failed.map((f) => ({ ...f, row: f.row + i })));
        setProgressPct(Math.round(((i + slice.length) / finalRows.length) * 100));
      }

      setResult({ total: finalRows.length, inserted, transferPairs: pairs, failed: allFailed });
      setStep("result");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  // Income/expense filter for showing right options per category
  function rawCategoryType(rawName: string): CategoryType {
    // Look at how this category is used in the parsed data
    if (!parsed) return "expense";
    const example = parsed.normalized.find((n) => n.category === rawName);
    return example?.kind === "income" ? "income" : "expense";
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEP_ORDER.map((s, i) => {
          const done = i < currentStepIdx;
          const current = i === currentStepIdx;
          return (
            <div key={s} className="flex items-center gap-1 sm:gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors",
                  done && "bg-green-500 text-white",
                  current && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  !done && !current && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs sm:text-sm font-medium whitespace-nowrap", current && "text-primary")}>
                {STEP_TITLES[s]}
              </span>
              {i < STEP_ORDER.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-1", done ? "bg-green-500" : "bg-muted")} />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Step: Source ───────────────────────────────────────────────── */}
      {step === "source" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Pilih Sumber Data</CardTitle>
            <CardDescription>
              Pilih aplikasi yang kamu pakai sebelumnya. Untuk sementara baru Money Lover yang siap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {IMPORT_SOURCES.map((s) => {
              const isActive = source?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (!s.available) return;
                    setSource(s);
                    setStep("upload");
                  }}
                  disabled={!s.available}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                    s.available
                      ? "border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                      : "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed",
                    isActive && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  )}
                >
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm">{s.name}</p>
                      {!s.available && (
                        <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  {s.available && <ArrowRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />}
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Step: Upload ────────────────────────────────────────────────── */}
      {step === "upload" && source && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">{source.icon}</span>
              Upload File dari {source.name}
            </CardTitle>
            <CardDescription>
              Export transaksi dari {source.name} → File → Download → CSV, lalu upload di sini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary hover:bg-muted/40 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-sm">Klik untuk pilih file CSV</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Atau drop file ke sini. Format: CSV export Money Lover.
                </p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            {parseError && (
              <div className="mt-3 flex items-start gap-2 bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="mt-4 bg-muted rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Cara export dari Money Lover Web:</p>
              <p>1. Buka <code className="text-primary">moneylover.me</code> → Transactions</p>
              <p>2. Klik <strong>3-dot menu</strong> → <strong>Export</strong></p>
              <p>3. Pilih period & wallet, download CSV</p>
              <p>4. Upload file-nya di sini</p>
            </div>

            <div className="mt-3 flex">
              <Button variant="outline" size="sm" onClick={() => { setStep("source"); setSource(null); }}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Ganti sumber
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step: Mapping ──────────────────────────────────────────────── */}
      {step === "map" && parsed && (
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Mapping Dompet</CardTitle>
              <CardDescription>
                Pilih dompet di CallFin untuk setiap nama dompet dari Money Lover. Buat baru kalau belum ada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {parsed.uniqueWallets.map((raw) => {
                const walletItems: ComboboxItem[] = wallets.map((w) => ({
                  value: w.id,
                  label: w.name,
                  icon: w.icon,
                }));
                return (
                  <div key={raw} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border border-border">
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{raw}</span>
                    <ArrowRight className="hidden sm:block h-3 w-3 text-muted-foreground shrink-0" />
                    <Combobox
                      value={walletMap[raw] || ""}
                      onValueChange={(v) => setWalletMap((m) => ({ ...m, [raw]: v }))}
                      items={walletItems}
                      placeholder="Pilih dompet"
                      searchPlaceholder="Cari dompet..."
                      emptyMessage="Tidak ada dompet."
                      onCreate={() => setNewWalletFor(raw)}
                      createLabel="Buat dompet baru"
                      triggerClassName="w-full sm:w-[220px]"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Mapping Kategori</CardTitle>
              <CardDescription>
                Auto-mapped untuk yang umum. Pilih manual untuk sisanya, atau buat kategori baru.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {parsed.uniqueCategories.map((raw) => {
                const type = rawCategoryType(raw);
                const items: ComboboxItem[] = categories
                  .filter((c) => c.type === type && !c.isInternal)
                  .map((c) => ({ value: c.name, label: c.name, icon: c.icon }));
                return (
                  <div key={raw} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border border-border">
                    <span className="text-sm font-medium flex-1 min-w-0 truncate flex items-center gap-1">
                      {type === "income" ? <TrendingUp className="h-3 w-3 text-green-600 shrink-0" /> : <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />}
                      <span className="truncate">{raw}</span>
                    </span>
                    <ArrowRight className="hidden sm:block h-3 w-3 text-muted-foreground shrink-0" />
                    <Combobox
                      value={categoryMap[raw] || ""}
                      onValueChange={(v) => setCategoryMap((m) => ({ ...m, [raw]: v }))}
                      items={items}
                      placeholder="Pilih kategori"
                      searchPlaceholder="Cari kategori..."
                      emptyMessage="Tidak ada kategori."
                      onCreate={() => setNewCategoryFor({ name: raw, type })}
                      createLabel="Buat kategori baru"
                      triggerClassName="w-full sm:w-[240px]"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
            <Button onClick={() => setStep("review")} disabled={!canReview}>
              Lanjut <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step: Review ───────────────────────────────────────────────── */}
      {step === "review" && parsed && (
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Import</CardTitle>
              <CardDescription>{finalRows.length} transaksi siap diimport.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <p className="text-xs text-muted-foreground">Pemasukan</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{summary.income}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatRupiah(summary.incomeAmount)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <p className="text-xs text-muted-foreground">Pengeluaran</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{summary.expense}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatRupiah(summary.expenseAmount)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowLeftRight className="h-4 w-4 text-sky-600" />
                    <p className="text-xs text-muted-foreground">Transfer</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{summary.transfer}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatRupiah(summary.transferAmount)}</p>
                </div>
              </div>

              {parsed.errors.length > 0 && (
                <div className="mt-3 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 rounded-lg p-3 text-xs">
                  <p className="font-medium mb-1">{parsed.errors.length} baris di-skip karena error parse:</p>
                  <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                    {parsed.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>Baris {e.row}: {e.reason}</li>
                    ))}
                    {parsed.errors.length > 5 && <li>...dan {parsed.errors.length - 5} lainnya.</li>}
                  </ul>
                </div>
              )}

              <div className="mt-3 bg-muted rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">Catatan:</p>
                <p>• Saldo dompet akan otomatis ter-update sesuai transaksi yang masuk.</p>
                <p>• Transfer pair di Money Lover digabung jadi 1 transaksi transfer di CallFin.</p>
                <p>• Import bersifat append — transaksi existing-mu tidak akan dihapus.</p>
              </div>
            </CardContent>
          </Card>

          {importing && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm font-medium">Mengimport... {progressPct}%</p>
                </div>
                <div className="bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep("map")} disabled={importing}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
            <Button onClick={doImport} disabled={importing}>
              {importing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Mengimport</> : <>Mulai Import ({finalRows.length}) <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step: Result ───────────────────────────────────────────────── */}
      {step === "result" && result && (
        <Card className={cn("border-border/50", result.failed.length === 0 ? "bg-green-50/50 dark:bg-green-950/30" : "")}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {result.failed.length === 0 ? (
                <><CheckCircle2 className="h-5 w-5 text-green-600" /> Import Berhasil!</>
              ) : (
                <><AlertCircle className="h-5 w-5 text-amber-600" /> Import Selesai dengan Catatan</>
              )}
            </CardTitle>
            <CardDescription>
              {result.inserted} dari {result.total} transaksi berhasil dimasukkan ke akunmu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{result.inserted}</p>
                <p className="text-xs text-muted-foreground">Berhasil</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-sky-600">{result.transferPairs}</p>
                <p className="text-xs text-muted-foreground">Transfer</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className={cn("text-2xl font-bold tabular-nums", result.failed.length > 0 ? "text-amber-600" : "text-muted-foreground")}>
                  {result.failed.length}
                </p>
                <p className="text-xs text-muted-foreground">Gagal</p>
              </div>
            </div>

            {result.failed.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 rounded-lg p-3 text-xs mb-3">
                <p className="font-medium mb-1">Detail error (maks 5):</p>
                <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                  {result.failed.slice(0, 5).map((f, i) => (
                    <li key={i}>Row {f.row}: {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setStep("source");
                setSource(null);
                setParsed(null);
                setResult(null);
                setCategoryMap({});
                setWalletMap({});
              }}>
                Import Lagi
              </Button>
              <Button onClick={() => window.location.href = "/transactions"}>
                Lihat Transaksi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline create dialogs */}
      <CategoryDialog
        open={!!newCategoryFor}
        onOpenChange={(o) => !o && setNewCategoryFor(null)}
        defaultType={newCategoryFor?.type}
      />
      <WalletDialog
        open={!!newWalletFor}
        onOpenChange={(o) => !o && setNewWalletFor(null)}
      />
      {/* After creating, user re-selects in the dropdown — we don't auto-bind to avoid race conditions */}
    </div>
  );
}
