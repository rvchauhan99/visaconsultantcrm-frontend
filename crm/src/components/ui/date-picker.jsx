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
 * DatePicker — CRM compact popover calendar.
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
            "crm-input flex w-full items-center justify-between gap-1.5 text-left cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            triggerClassName,
            className,
          )}
        >
          <span className="min-w-0 flex-1 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-ink-muted opacity-70" />
            {label ? (
              <span className="truncate">{label}</span>
            ) : (
              <span className="text-ink-muted truncate">{placeholder}</span>
            )}
          </span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="p-0.5 text-ink-muted hover:text-ink shrink-0"
              data-testid={testId ? `${testId}-clear` : undefined}
            >
              <X className="w-3 h-3" />
            </span>
          )}
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
