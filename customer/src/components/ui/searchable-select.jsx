"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * SearchableSelect — Editorial Luxe searchable combobox (static options).
 * options: [{ value, label, searchText?, icon? }]
 */
export function SearchableSelect({
  options = [],
  value = null,
  onChange,
  getOptionValue = (o) => o?.value ?? o?.id ?? o?.code,
  getOptionLabel = (o) => o?.label ?? o?.name ?? String(getOptionValue(o) ?? ""),
  renderOption,
  renderValue,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results",
  clearable = true,
  disabled = false,
  className = "",
  contentClassName = "",
  triggerClassName = "",
  "data-testid": testId,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const values = useMemo(() => {
    return value == null || value === "" ? [] : [value];
  }, [value]);

  const selected = useMemo(() => {
    if (!values.length) return null;
    return options.find((o) => String(getOptionValue(o)) === String(values[0])) || null;
  }, [options, values, getOptionValue]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const triggerContent = () => {
    if (!selected) return <span className="text-ink-muted truncate">{placeholder}</span>;
    if (renderValue) return renderValue(selected);
    return <span className="truncate">{getOptionLabel(selected)}</span>;
  };

  const select = (option) => {
    const v = getOptionValue(option);
    onChange?.(v, option);
    setOpen(false);
    setQuery("");
  };

  const clear = (e) => {
    e?.stopPropagation?.();
    onChange?.(null, null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[14px] border border-border bg-surface-card",
            "px-4 py-3 text-left font-sans text-sm text-ink outline-none",
            "transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            "hover:border-border-strong focus:border-navy focus:shadow-[0_0_0_4px_var(--glow-navy)]",
            "disabled:opacity-50",
            triggerClassName,
            className,
          )}
        >
          <span className="min-w-0 flex-1 flex items-center gap-2">{triggerContent()}</span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && selected && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={clear}
                className="p-0.5 text-ink-muted hover:text-ink"
                data-testid={testId ? `${testId}-clear` : undefined}
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronsUpDown className="w-4 h-4 text-ink-muted opacity-60" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0",
          contentClassName,
        )}
        align="start"
      >
        <Command shouldFilter className="rounded-[14px]">
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const v = getOptionValue(option);
                const isSel = selected && String(getOptionValue(selected)) === String(v);
                const searchValue = [
                  getOptionLabel(option),
                  String(v),
                  option?.searchText,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <CommandItem
                    key={String(v)}
                    value={searchValue}
                    onSelect={() => select(option)}
                    data-testid={testId ? `${testId}-opt-${v}` : undefined}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSel ? "opacity-100 text-navy" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {renderOption ? renderOption(option) : getOptionLabel(option)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
