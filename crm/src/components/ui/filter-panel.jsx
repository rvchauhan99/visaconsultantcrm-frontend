import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmInput, CrmSelect } from "@/components/ui/crm-field";
import { DatePicker } from "@/components/ui/date-picker";
import { MultiSelect } from "@/components/ui/multi-select";

/**
 * Declarative collapsible filter panel.
 *
 * fields: Array<{
 *   key, label, type: 'text'|'select'|'multiselect'|'date'|'daterange'|'numrange'|'async'|'checkbox',
 *   options?: [{value,label}], placeholder?, fromKey?, toKey?, minKey?, maxKey?,
 *   render?: (value, onChange) => ReactNode  // for async / custom
 * }>
 */
export function FilterPanel({
  fields = [],
  values = {},
  q = "",
  onApply,
  onClear,
  onQChange,
  activeCount = 0,
  defaultOpen = false,
  searchPlaceholder = "Search…",
  className,
  testId = "filter-panel",
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState(values);
  const [draftQ, setDraftQ] = useState(q);

  const valuesKey = useMemo(() => {
    try { return JSON.stringify(values ?? {}); } catch { return ""; }
  }, [values]);

  useEffect(() => {
    setDraft(values && typeof values === "object" ? values : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when values content changes
  }, [valuesKey]);

  useEffect(() => { setDraftQ(q); }, [q]);

  // Debounced quick search — only fire when draft differs from committed q
  useEffect(() => {
    if (draftQ === q) return undefined;
    const t = setTimeout(() => onQChange?.(draftQ), 350);
    return () => clearTimeout(t);
  }, [draftQ, q, onQChange]);

  const chips = useMemo(() => {
    const out = [];
    if (q) out.push({ key: "q", label: "Search", value: q });
    fields.forEach((f) => {
      if (f.type === "daterange") {
        const from = values[f.fromKey || `${f.key}_from`];
        const to = values[f.toKey || `${f.key}_to`];
        if (from || to) out.push({ key: f.key, label: f.label, value: `${from || "…"} → ${to || "…"}` });
        return;
      }
      if (f.type === "numrange") {
        const min = values[f.minKey || `${f.key}_min`];
        const max = values[f.maxKey || `${f.key}_max`];
        if (min || max) out.push({ key: f.key, label: f.label, value: `${min || "…"} – ${max || "…"}` });
        return;
      }
      const v = values[f.key];
      if (v == null || v === "" || v === false) return;
      let display = String(v);
      if (f.options) {
        const parts = String(v).split(",");
        display = parts.map((p) => f.options.find((o) => String(o.value) === p)?.label || p).join(", ");
      }
      if (f.type === "checkbox") display = "Yes";
      out.push({ key: f.key, label: f.label, value: display });
    });
    return out;
  }, [fields, values, q]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const apply = () => onApply?.(draft);
  const clear = () => {
    setDraft({});
    setDraftQ("");
    onClear?.();
  };

  const removeChip = (chip) => {
    if (chip.key === "q") {
      setDraftQ("");
      onQChange?.("");
      return;
    }
    const field = fields.find((f) => f.key === chip.key);
    const next = { ...values };
    if (field?.type === "daterange") {
      next[field.fromKey || `${field.key}_from`] = "";
      next[field.toKey || `${field.key}_to`] = "";
    } else if (field?.type === "numrange") {
      next[field.minKey || `${field.key}_min`] = "";
      next[field.maxKey || `${field.key}_max`] = "";
    } else {
      next[chip.key] = "";
    }
    onApply?.(next);
  };

  return (
    <div className={cn("bg-gradient-to-br from-surface-card to-surface-warm border border-border rounded-[14px] shadow-[var(--shadow-card)] mb-2.5", className)} data-testid={testId}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
          <CrmInput
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-9 text-xs"
            data-testid={`${testId}-q`}
          />
        </div>
        <CrmButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          data-testid={`${testId}-toggle`}
          className="h-9"
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.2rem] h-[1.1rem] px-1 rounded-full bg-gradient-to-r from-navy to-teal text-white text-[10px] font-mono">
              {activeCount}
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", open && "rotate-180")} />
        </CrmButton>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 ml-2 pl-3 border-l border-border/60">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeChip(chip)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-muted border border-border/50 text-[10px] text-ink hover:border-navy/30 transition-all duration-200 group"
                data-testid={`${testId}-chip-${chip.key}`}
              >
                <span className="text-ink-muted">{chip.label}:</span>
                <span className="font-semibold max-w-[140px] truncate">{chip.value}</span>
                <X className="w-3 h-3 text-ink-muted group-hover:text-ink transition-colors" />
              </button>
            ))}
            <button
              type="button"
              onClick={clear}
              className="text-[11px] font-semibold text-ink-muted hover:text-ink px-2 py-1 rounded-lg hover:bg-surface-muted transition-all duration-200 ml-1"
              data-testid={`${testId}-clear`}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-border p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
            {fields.map((f) => (
              <div key={f.key} className={cn(
                (f.type === "daterange" || f.type === "numrange") && "col-span-2",
                f.type === "async" && "col-span-1",
              )}>
                <div className="text-[10px] uppercase font-mono tracking-[0.14em] text-ink-muted mb-1.5">{f.label}</div>
                <FilterField field={f} draft={draft} setField={setField} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border">
            <CrmButton type="button" variant="ghost" size="sm" onClick={clear}>Clear all</CrmButton>
            <CrmButton type="button" variant="solid" size="sm" onClick={apply} data-testid={`${testId}-apply`}>
              Apply filters
            </CrmButton>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterField({ field, draft, setField }) {
  if (field.render) {
    return field.render(draft[field.key], (v) => setField(field.key, v), draft, setField);
  }

  if (field.type === "select") {
    return (
      <CrmSelect
        value={draft[field.key] || ""}
        onChange={(e) => setField(field.key, e.target.value)}
      >
        <option value="">{field.placeholder || "Any"}</option>
        {(field.options || []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </CrmSelect>
    );
  }

  if (field.type === "multiselect") {
    return (
      <MultiSelect
        value={draft[field.key] || ""}
        onChange={(v) => setField(field.key, v)}
        options={field.options || []}
        placeholder={field.placeholder || "Any"}
        testId={`filter-${field.key}`}
      />
    );
  }

  if (field.type === "date") {
    return (
      <DatePicker
        value={draft[field.key] || null}
        onChange={(v) => setField(field.key, v || "")}
      />
    );
  }

  if (field.type === "daterange") {
    const fromKey = field.fromKey || `${field.key}_from`;
    const toKey = field.toKey || `${field.key}_to`;
    return (
      <div className="flex items-center gap-1.5">
        <DatePicker
          value={draft[fromKey] || null}
          onChange={(v) => setField(fromKey, v || "")}
          placeholder="From"
        />
        <span className="text-[10px] text-ink-muted">–</span>
        <DatePicker
          value={draft[toKey] || null}
          onChange={(v) => setField(toKey, v || "")}
          placeholder="To"
        />
      </div>
    );
  }

  if (field.type === "numrange") {
    const minKey = field.minKey || `${field.key}_min`;
    const maxKey = field.maxKey || `${field.key}_max`;
    return (
      <div className="flex items-center gap-1.5">
        <CrmInput type="number" placeholder="Min" value={draft[minKey] || ""} onChange={(e) => setField(minKey, e.target.value)} />
        <span className="text-[10px] text-ink-muted">–</span>
        <CrmInput type="number" placeholder="Max" value={draft[maxKey] || ""} onChange={(e) => setField(maxKey, e.target.value)} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface-card text-xs text-ink cursor-pointer hover:border-border-strong transition-colors">
        <input
          type="checkbox"
          checked={draft[field.key] === true || draft[field.key] === "true" || draft[field.key] === "1"}
          onChange={(e) => setField(field.key, e.target.checked ? "true" : "")}
        />
        {field.placeholder || field.label}
      </label>
    );
  }

  return (
    <CrmInput
      value={draft[field.key] || ""}
      onChange={(e) => setField(field.key, e.target.value)}
      placeholder={field.placeholder}
    />
  );
}
