import type { Transaction, Wallet } from "@/types";

/** Escape a CSV field: wrap in quotes when it contains a comma, quote or newline. */
function esc(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const TYPE_LABEL: Record<Transaction["type"], string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  transfer: "Transfer",
};

/**
 * Build a spreadsheet-friendly CSV of transactions. Amount is a raw integer
 * (no "Rp"/thousands separators) so Excel/Sheets can sum it; the Tipe column
 * carries the income/expense/transfer direction. Prefixed with a UTF-8 BOM so
 * Excel opens it with the right encoding.
 */
export function transactionsToCsv(txs: Transaction[], wallets: Wallet[]): string {
  const walletName = (id?: string) => wallets.find((w) => w.id === id)?.name ?? "";
  const header = ["Tanggal", "Tipe", "Kategori", "Deskripsi", "Dompet", "Tujuan", "Jumlah"];
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) =>
      [
        t.date,
        TYPE_LABEL[t.type] ?? t.type,
        t.category,
        t.description ?? "",
        walletName(t.wallet_id),
        t.type === "transfer" ? walletName(t.transfer_to_wallet_id) : "",
        t.amount,
      ]
        .map(esc)
        .join(","),
    );
  return "﻿" + [header.map(esc).join(","), ...rows].join("\r\n");
}

/** Trigger a client-side download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
