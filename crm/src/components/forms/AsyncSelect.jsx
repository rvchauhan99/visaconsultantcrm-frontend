import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
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
 * Server-driven searchable select.
 * - Opens → fetches first `pageSize` rows
 * - Typing → debounced `q` refetch with AbortController
 * - cmdk client filter OFF (shouldFilter={false})
 */
export default function AsyncSelect({
    fetcher,
    value = null,
    onChange,
    getOptionValue = (o) => o?.id ?? o?.code ?? o?.value,
    getOptionLabel = (o) => o?.label ?? o?.full_name ?? o?.name ?? o?.title ?? String(getOptionValue(o) ?? ""),
    multiple = false,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyText = "No results",
    debounceMs = 300,
    pageSize = 10,
    clearable = true,
    disabled = false,
    className = "",
    testId,
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCache, setSelectedCache] = useState(() => new Map());
    const abortRef = useRef(null);
    const debounceRef = useRef(null);

    const values = useMemo(() => {
        if (multiple) return Array.isArray(value) ? value : [];
        return value == null || value === "" ? [] : [value];
    }, [value, multiple]);

    // Debounce search text
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQ(query), debounceMs);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, debounceMs]);

    const load = useCallback(
        async (q) => {
            if (abortRef.current) abortRef.current.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            setLoading(true);
            try {
                const res = await fetcher({
                    q: q || undefined,
                    limit: pageSize,
                    signal: ctrl.signal,
                    id: !multiple && values[0] ? values[0] : undefined,
                    ids: multiple && values.length ? values : undefined,
                });
                if (ctrl.signal.aborted) return;
                const list = Array.isArray(res) ? res : (res?.items || []);
                setItems(list);
                setSelectedCache((prev) => {
                    const next = new Map(prev);
                    list.forEach((o) => next.set(String(getOptionValue(o)), o));
                    return next;
                });
            } catch (e) {
                if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED" || e?.name === "AbortError") return;
                setItems([]);
            } finally {
                if (!ctrl.signal.aborted) setLoading(false);
            }
        },
        [fetcher, pageSize, multiple, values, getOptionValue],
    );

    useEffect(() => {
        if (!open) return;
        load(debouncedQ);
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, [open, debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

    // Hydrate labels for current value(s) when closed / on mount
    useEffect(() => {
        if (!values.length) return;
        const missing = values.filter((v) => !selectedCache.has(String(v)));
        if (!missing.length) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetcher({
                    limit: pageSize,
                    id: !multiple ? missing[0] : undefined,
                    ids: multiple ? missing : undefined,
                });
                if (cancelled) return;
                const list = Array.isArray(res) ? res : (res?.items || []);
                setSelectedCache((prev) => {
                    const next = new Map(prev);
                    list.forEach((o) => next.set(String(getOptionValue(o)), o));
                    return next;
                });
            } catch (_) { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, [values.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedOptions = values
        .map((v) => selectedCache.get(String(v)) || items.find((o) => String(getOptionValue(o)) === String(v)))
        .filter(Boolean);

    const triggerLabel = () => {
        if (!values.length) return placeholder;
        if (multiple) {
            if (selectedOptions.length === 0) return `${values.length} selected`;
            if (selectedOptions.length === 1) return getOptionLabel(selectedOptions[0]);
            return `${selectedOptions.length} selected`;
        }
        return selectedOptions[0] ? getOptionLabel(selectedOptions[0]) : String(values[0]);
    };

    const toggle = (option) => {
        const v = getOptionValue(option);
        setSelectedCache((prev) => {
            const next = new Map(prev);
            next.set(String(v), option);
            return next;
        });
        if (multiple) {
            const set = new Set(values.map(String));
            if (set.has(String(v))) set.delete(String(v));
            else set.add(String(v));
            const nextVals = Array.from(set);
            const opts = nextVals.map((x) =>
                (String(getOptionValue(option)) === String(x) ? option : selectedCache.get(String(x)) || items.find((i) => String(getOptionValue(i)) === String(x)))
            ).filter(Boolean);
            onChange?.(nextVals, opts);
        } else {
            onChange?.(v, option);
            setOpen(false);
            setQuery("");
        }
    };

    const clear = (e) => {
        e?.stopPropagation?.();
        onChange?.(multiple ? [] : null, multiple ? [] : null);
    };

    const isSelected = (option) => values.map(String).includes(String(getOptionValue(option)));

    // Pin selected at top
    const displayItems = useMemo(() => {
        const seen = new Set();
        const out = [];
        selectedOptions.forEach((o) => {
            const k = String(getOptionValue(o));
            if (!seen.has(k)) {
                seen.add(k);
                out.push(o);
            }
        });
        items.forEach((o) => {
            const k = String(getOptionValue(o));
            if (!seen.has(k)) {
                seen.add(k);
                out.push(o);
            }
        });
        return out;
    }, [items, selectedOptions, getOptionValue]);

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    data-testid={testId}
                    className={cn(
                        "flex h-8 w-full items-center justify-between gap-1 rounded-sm border border-border bg-white px-2 text-left text-sm outline-none hover:border-navy focus:ring-1 focus:ring-navy disabled:opacity-50",
                        !values.length && "text-ink-muted",
                        className,
                    )}
                >
                    <span className="truncate flex-1">{triggerLabel()}</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                        {clearable && values.length > 0 && !disabled && (
                            <span
                                role="button"
                                tabIndex={-1}
                                onClick={clear}
                                className="p-0.5 text-ink-muted hover:text-ink"
                                data-testid={testId ? `${testId}-clear` : undefined}
                            >
                                <X className="w-3 h-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="w-3.5 h-3.5 text-ink-muted opacity-60" />
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 rounded-sm" align="start">
                <Command shouldFilter={false} className="rounded-sm">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={query}
                        onValueChange={setQuery}
                        className="h-9 text-sm"
                    />
                    <CommandList className="max-h-56">
                        {loading && (
                            <div className="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                            </div>
                        )}
                        {!loading && displayItems.length === 0 && (
                            <CommandEmpty className="py-4 text-xs">{emptyText}</CommandEmpty>
                        )}
                        <CommandGroup>
                            {displayItems.map((option) => {
                                const v = getOptionValue(option);
                                const selected = isSelected(option);
                                return (
                                    <CommandItem
                                        key={String(v)}
                                        value={String(v)}
                                        onSelect={() => toggle(option)}
                                        className="text-sm cursor-pointer"
                                        data-testid={testId ? `${testId}-opt-${v}` : undefined}
                                    >
                                        <Check className={cn("mr-2 h-3.5 w-3.5", selected ? "opacity-100 text-navy" : "opacity-0")} />
                                        <span className="truncate">{getOptionLabel(option)}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                    {multiple && values.length > 0 && (
                        <div className="border-t border-border px-2 py-1.5 flex flex-wrap gap-1">
                            {selectedOptions.map((o) => (
                                <span
                                    key={String(getOptionValue(o))}
                                    className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-surface border border-border rounded-sm px-1.5 py-0.5"
                                >
                                    {getOptionLabel(o)}
                                    <button type="button" className="text-ink-muted hover:text-danger" onClick={() => toggle(o)}>
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
}
