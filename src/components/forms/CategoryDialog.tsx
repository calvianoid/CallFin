"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Category, CategoryType } from "@/types";
import { CATEGORY_COLOR_OPTIONS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Category;
  defaultType?: CategoryType;
}

const COMMON_EMOJIS = ["📌", "💼", "🏠", "🚗", "🍔", "🎬", "🛍️", "🏥", "📚", "✈️", "🎁", "💻", "🎮", "☕", "🐶", "💰", "📈", "🏋️", "🧾", "🎵"];

export function CategoryDialog({ open, onOpenChange, initial, defaultType }: CategoryDialogProps) {
  const { categories, addCategory, updateCategory } = useStore();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState<CategoryType>(initial?.type || defaultType || "expense");
  const [color, setColor] = useState(initial?.color || CATEGORY_COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(initial?.icon || "📌");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setType(initial?.type || defaultType || "expense");
      setColor(initial?.color || CATEGORY_COLOR_OPTIONS[0]);
      setIcon(initial?.icon || "📌");
      setError(null);
    }
  }, [open, initial, defaultType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Validate uniqueness within same type
    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.type === type && c.id !== initial?.id
    );
    if (duplicate) {
      setError(`Kategori "${trimmed}" sudah ada untuk tipe ${type === "income" ? "Pemasukan" : "Pengeluaran"}.`);
      return;
    }

    if (isEdit && initial) {
      updateCategory(initial.id, { name: trimmed, type, color, icon });
    } else {
      addCategory({ name: trimmed, type, color, icon });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          <DialogDescription>
            Bikin kategori sendiri sesuai kebiasaan keuanganmu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type tabs (only when creating new) */}
          {!isEdit && (
            <Tabs value={type} onValueChange={(v) => setType(v as CategoryType)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="expense">📉 Pengeluaran</TabsTrigger>
                <TabsTrigger value="income">📈 Pemasukan</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {isEdit && initial?.isInternal && (
            <div className="text-xs text-muted-foreground bg-muted rounded-md p-2">
              Kategori internal — dipakai sistem untuk setoran goal. Tipe tidak bisa diubah.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Kategori</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Contoh: Olahraga, Skincare, Donasi"
              required
              autoFocus
              maxLength={24}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={cn(
                    "w-9 h-9 rounded-md text-lg flex items-center justify-center transition-all border",
                    icon === e ? "border-primary bg-primary/10 scale-110" : "border-border hover:bg-muted"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium transition-all",
                    c,
                    color === c ? "ring-2 ring-offset-2 ring-foreground scale-105" : "hover:scale-105 opacity-70"
                  )}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Preview</span>
            <Badge variant="secondary" className={cn("text-xs gap-1", color)}>
              <span>{icon}</span>
              <span>{name || "Nama Kategori"}</span>
            </Badge>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit">{isEdit ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
