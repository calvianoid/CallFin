"use client";

import { useState, type ReactNode } from "react";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ComboboxItem {
  value: string;
  label: string;
  icon?: string;
  /** Optional extra text shown after the label in dimmed style. */
  hint?: string;
}

interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  items: ComboboxItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Optional "Create new ..." action shown at the bottom. */
  onCreate?: () => void;
  createLabel?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function Combobox({
  value,
  onValueChange,
  items,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ada hasil.",
  onCreate,
  createLabel = "Buat baru",
  className,
  triggerClassName,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);

  const renderItemContent = (item: ComboboxItem): ReactNode => (
    <span className="flex items-center gap-2 flex-1 min-w-0">
      {item.icon && <span className="shrink-0">{item.icon}</span>}
      <span className="truncate">{item.label}</span>
      {item.hint && <span className="text-xs text-muted-foreground shrink-0">{item.hint}</span>}
    </span>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("justify-between font-normal", triggerClassName)}
          >
            {selected ? (
              renderItemContent(selected)
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className={cn("p-0 w-[var(--anchor-width)] min-w-[240px]", className)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={`${item.label} ${item.hint ?? ""}`}
                  onSelect={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {renderItemContent(item)}
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onCreate();
                      setOpen(false);
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    {createLabel}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
