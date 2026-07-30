"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center gap-1",
        caption_label: "hidden",
        caption_dropdowns: "flex items-center gap-1.5",
        dropdown_month: "relative inline-flex items-center",
        dropdown_year: "relative inline-flex items-center",
        dropdown:
          "h-8 rounded-md border border-border bg-surface-card px-2 pr-6 text-xs font-medium text-ink outline-none cursor-pointer hover:border-border-strong focus:border-navy",
        dropdown_icon: "hidden",
        vhidden: "sr-only",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "secondary", size: "xs" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 rounded-full",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-ink-muted rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-surface-muted",
          "[&:has([aria-selected].day-outside)]:bg-surface-muted/50",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost", size: "xs" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full",
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-navy text-white hover:bg-navy hover:text-white focus:bg-navy focus:text-white",
        day_today: "bg-surface-muted text-ink font-semibold",
        day_outside:
          "day-outside text-ink-muted opacity-50 aria-selected:bg-surface-muted/50 aria-selected:text-ink-muted",
        day_disabled: "text-ink-muted opacity-40",
        day_range_middle: "aria-selected:bg-surface-muted aria-selected:text-ink",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className: iconClass, ...iconProps }) => (
          <ChevronLeft className={cn("h-4 w-4", iconClass)} {...iconProps} />
        ),
        IconRight: ({ className: iconClass, ...iconProps }) => (
          <ChevronRight className={cn("h-4 w-4", iconClass)} {...iconProps} />
        ),
        IconDropdown: () => null,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
export default Calendar;
