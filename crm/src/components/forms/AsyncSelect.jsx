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

const DEFAULT_GET_OPTION_VALUE = (o) => o?.id ?? o?.code ?? o?.value;
const DEFAULT_GET_OPTION_LABEL = (o) =>
    o?.label ?? o?.full_name ?? o?.name ?? o?.title ?? String(DEFAULT_GET_OPTION_VALUE(o) ?? "");

/**
 * SearchableSelect — theme-matched searchable combobox.
 *
 * Modes:
 * - Static: pass `options` → client-side cmdk filter
 * - Async: pass `fetcher` → debounced server search (shouldFilter=false)
 *
 * AsyncSelect is kept as an alias for backward compatibility.
 */
export function SearchableSelect({
    options = null,
    fetcher,
    value = null,
    onChange,
    getOptionValue = DEFAULT_GET_OPTION_VALUE,
    getOptionLabel = DEFAULT_GET_OPTION_LABEL,
    renderOption,
    renderValue,
    multiple = false,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyText = "No results",
    debounceMs = 300,
    pageSize = 10,
    clearable = true,
    showChipsInline = false,
    disabled = false,
    className = "",
    contentClassName = "",
    testId,
    "data-testid": dataTestId,
}) {
    const resolvedTestId = testId || dataTestId;
    const isStatic = Array.isArray(options);

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

    useEffect(() => {
        if (isStatic) return undefined;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQ(query), debounceMs);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, debounceMs, isStatic]);

    const load = useCallback(
        async (q) => {
            if (!fetcher) return;
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
        if (isStatic || !open) return undefined;
        load(debouncedQ);
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, [open, debouncedQ, isStatic]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isStatic || !fetcher || !values.length) return undefined;
        const missing = values.filter((v) => !selectedCache.has(String(v)));
        if (!missing.length) return undefined;
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
    }, [values.join("|"), isStatic]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isStatic) return;
        setSelectedCache((prev) => {
            const next = new Map(prev);
            options.forEach((o) => next.set(String(getOptionValue(o)), o));
            return next;
        });
        setItems(options);
    }, [isStatic, options, getOptionValue]);

    const selectedOptions = values
        .map((v) => {
            if (isStatic) {
                return options.find((o) => String(getOptionValue(o)) === String(v))
                    || selectedCache.get(String(v));
            }
            return selectedCache.get(String(v))
                || items.find((o) => String(getOptionValue(o)) === String(v));
        })
        .filter(Boolean);

    const triggerLabel = () => {
        if (!values.length) return placeholder;
        if (renderValue && selectedOptions[0] && !multiple) {
            return renderValue(selectedOptions[0]);
        }
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
                (String(getOptionValue(option)) === String(x)
                    ? option
                    : selectedCache.get(String(x))
                        || items.find((i) => String(getOptionValue(i)) === String(x))
                        || (isStatic ? options.find((i) => String(getOptionValue(i)) === String(x)) : null))
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

    const displayItems = useMemo(() => {
        const source = isStatic ? options : items;
        const seen = new Set();
        const out = [];
        selectedOptions.forEach((o) => {
            const k = String(getOptionValue(o));
            if (!seen.has(k)) {
                seen.add(k);
                out.push(o);
            }
        });
        source.forEach((o) => {
            const k = String(getOptionValue(o));
            if (!seen.has(k)) {
                seen.add(k);
                out.push(o);
            }
        });
        return out;
    }, [isStatic, options, items, selectedOptions, getOptionValue]);

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    data-testid={resolvedTestId}
                    className={cn(
                        "flex min-h-8 w-full items-center justify-between gap-1 rounded-md border border-border bg-surface-elevated px-2 text-left text-xs outline-none",
                        showChipsInline && multiple && values.length > 0 && "h-auto py-1.5",
                        "hover:border-border-strong focus:border-navy focus:shadow-[0_0_0_3px_var(--glow-navy)]",
                        "transition-all duration-150 disabled:opacity-50",
                        !values.length && "text-ink-muted",
                        className,
                    )}
                >
                    {showChipsInline && multiple && values.length > 0 ? (
                        <span className="flex flex-wrap gap-1 flex-1 min-w-0">
                            {selectedOptions.map((o) => (
                                <span
                                    key={String(getOptionValue(o))}
                                    className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-surface border border-border rounded-sm px-1.5 py-0.5"
                                >
                                    {getOptionLabel(o)}
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        className="text-ink-muted hover:text-danger cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); toggle(o); }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggle(o);
                                            }
                                        }}
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </span>
                            ))}
                        </span>
                    ) : (
                        <span className="truncate flex-1 min-w-0">{triggerLabel()}</span>
                    )}
                    <span className="flex items-center gap-0.5 shrink-0">
                        {clearable && values.length > 0 && !disabled && (
                            <span
                                role="button"
                                tabIndex={-1}
                                onClick={clear}
                                className="p-0.5 text-ink-muted hover:text-ink"
                                data-testid={resolvedTestId ? `${resolvedTestId}-clear` : undefined}
                            >
                                <X className="w-3 h-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="w-3.5 h-3.5 text-ink-muted opacity-60" />
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className={cn(
                    "w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 rounded-md border-border bg-surface-elevated shadow-md",
                    contentClassName,
                )}
                align="start"
            >
                <Command shouldFilter={isStatic} className="rounded-md bg-surface-elevated">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={query}
                        onValueChange={setQuery}
                        className="h-9 text-xs"
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
                                const searchValue = [
                                    getOptionLabel(option),
                                    String(v),
                                    option?.searchText,
                                ].filter(Boolean).join(" ");
                                return (
                                    <CommandItem
                                        key={String(v)}
                                        value={searchValue}
                                        onSelect={() => toggle(option)}
                                        className="text-xs cursor-pointer data-[selected=true]:bg-navy/10 data-[selected=true]:text-ink"
                                        data-testid={resolvedTestId ? `${resolvedTestId}-opt-${v}` : undefined}
                                    >
                                        <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", selected ? "opacity-100 text-navy" : "opacity-0")} />
                                        <span className="truncate flex-1 min-w-0">
                                            {renderOption ? renderOption(option) : getOptionLabel(option)}
                                        </span>
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

/** @deprecated Prefer SearchableSelect — alias kept for existing imports */
export default function AsyncSelect(props) {
    return <SearchableSelect {...props} />;
}
