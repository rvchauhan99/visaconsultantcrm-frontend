"use client";

import { useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function toDate(value) {
  if (value == null || value === "") return undefined;
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : undefined;
}

function toIso(date) {
  if (!date || !isValid(date)) return null;
  return format(date, "yyyy-MM-dd");
}

/**
 * DatePicker — Editorial Luxe popover calendar.
 * value / onChange use ISO "yyyy-MM-dd" strings (or null).
 */
export function DatePicker({
  value = null,
  onChange,
  placeholder = "Select date",
  clearable = true,
  disabled = false,
  min,
  max,
  fromYear,
  toYear,
  className = "",
  triggerClassName = "",
  contentClassName = "",
  "data-testid": testId,
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => toDate(value), [value]);
  const minDate = useMemo(() => toDate(min), [min]);
  const maxDate = useMemo(() => toDate(max), [max]);

  const year = new Date().getFullYear();
  const from = fromYear ?? year - 100;
  const to = toYear ?? year + 20;

  const disabledMatchers = useMemo(() => {
    const list = [];
    if (minDate) list.push({ before: minDate });
    if (maxDate) list.push({ after: maxDate });
    return list.length ? list : undefined;
  }, [minDate, maxDate]);

  const label = selected ? format(selected, "dd MMM yyyy") : null;

  const clear = (e) => {
    e?.stopPropagation?.();
    onChange?.(null);
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
          <span className="min-w-0 flex-1 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 shrink-0 text-ink-muted opacity-70" />
            {label ? (
              <span className="truncate">{label}</span>
            ) : (
              <span className="text-ink-muted truncate">{placeholder}</span>
            )}
          </span>
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
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0", contentClassName)}
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            onChange?.(toIso(day));
            if (day) setOpen(false);
          }}
          disabled={disabledMatchers}
          defaultMonth={selected}
          fromYear={from}
          toYear={to}
          captionLayout="dropdown"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
