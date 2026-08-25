"use client"

import { useMemo, useState } from "react"
import { ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DELIVERY_BUCKETS } from "@/lib/delivery-filter"
import { cn } from "@/lib/utils"

/**
 * Delivery speed filter — attachment-style rows: selected brand dot + Label · count.
 */
export function DeliveryFilterSelect({
  value = "any",
  onChange,
  counts = {},
  className = "",
  triggerClassName = "",
  contentClassName = "",
  "data-testid": testId = "filter-delivery",
}) {
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => DELIVERY_BUCKETS.find((b) => b.value === value) || DELIVERY_BUCKETS[0],
    [value],
  )

  const handleSelect = (nextValue) => {
    onChange?.(nextValue)
    setOpen(false)
  }

  const handleKeyDown = (e, nextValue) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleSelect(nextValue)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Visa delivery: ${selected.label}`}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[14px] border border-border bg-surface-card",
            "px-4 py-3 text-left font-sans text-sm text-ink outline-none",
            "transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            "hover:border-border-strong focus:border-navy focus:shadow-[0_0_0_4px_var(--glow-navy)]",
            triggerClassName,
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate font-semibold">{selected.label}</span>
          <ChevronsUpDown className="w-4 h-4 text-ink-muted opacity-60 shrink-0" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-auto min-w-[220px] rounded-[24px] border-0 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
          contentClassName,
        )}
      >
        <ul
          role="listbox"
          aria-label="Visa delivery options"
          className="flex flex-col gap-1"
          data-testid={`${testId}-list`}
        >
          {DELIVERY_BUCKETS.map((bucket) => {
            const isSelected = bucket.value === selected.value
            const count = counts[bucket.value] ?? 0
            return (
              <li key={bucket.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-label={`${bucket.label}, ${count} visas`}
                  data-testid={`${testId}-opt-${bucket.value}`}
                  onClick={() => handleSelect(bucket.value)}
                  onKeyDown={(e) => handleKeyDown(e, bucket.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors",
                    "hover:bg-navy/5 focus:bg-navy/5 focus:outline-none",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isSelected ? "bg-navy" : "bg-transparent",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm text-ink">{bucket.label}</span>
                    <span className="text-ink-muted text-sm" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-ink-muted text-sm tabular-nums">{count}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export default DeliveryFilterSelect
