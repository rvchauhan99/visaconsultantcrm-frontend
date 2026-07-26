import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, SectionLabel } from "@/components/ui/page-header";
import { CrmCard } from "@/components/ui/crm-card";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmField, CrmInput, CrmSelect } from "@/components/ui/crm-field";

const DEFAULT_SEGMENTS = [
  { type: "FIXED", fixed_text: "PSG-" },
  { type: "DATE", date_format: "YYYY" },
  { type: "FIXED", fixed_text: "-" },
  { type: "SERIAL", width: 6, reset_interval: "YEARLY" },
];
const emptySegment = { type: "FIXED", fixed_text: "" };

function preview(segments, next = 1) {
  const now = new Date();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return segments.map((s) => {
    if (s.type === "FIXED") return s.fixed_text || "";
    if (s.type === "SERIAL") return String(next).padStart(Number(s.width) || 1, "0");
    return ({ DD: String(now.getDate()).padStart(2, "0"), MM: String(now.getMonth() + 1).padStart(2, "0"), YY: String(now.getFullYear()).slice(-2), YYYY: String(now.getFullYear()), Mmm: monthNames[now.getMonth()], MMM: monthNames[now.getMonth()].toUpperCase() })[s.date_format] || "";
  }).join("");
}

export default function CaseNumberSettings() {
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
  const [nextPreview, setNextPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const localPreview = useMemo(() => preview(segments), [segments]);
  const load = async () => {
    try {
      const { data } = await api.get("/admin/settings/case-number-format");
      setSegments(data.segments); setNextPreview(data.next_case_number_preview);
    } catch (error) { toast.error(error.response?.data?.detail || "Could not load case number settings"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const update = (index, patch) => setSegments((current) => current.map((segment, i) => i === index ? { ...segment, ...patch } : segment));
  const move = (index, direction) => setSegments((current) => {
    const next = [...current]; const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const setType = (index, type) => update(index, type === "FIXED" ? { type, fixed_text: "" } : type === "DATE" ? { type, date_format: "YYYY" } : { type, width: 6, reset_interval: "YEARLY" });
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings/case-number-format", { segments });
      setSegments(data.segments); setNextPreview(data.next_case_number_preview); toast.success("Case number format saved");
    } catch (error) { toast.error(error.response?.data?.detail || "Could not save case number format"); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-5xl" data-testid="case-number-settings-page">
      <PageHeader label="Admin" title="Case number settings" />
      <CrmCard className="p-5">
        <SectionLabel>Number format</SectionLabel>
        <p className="text-xs text-ink-muted mb-4">Changes apply only to cases created after you save. Existing case numbers are permanent.</p>
        <div className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-2 mb-4 flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted">Format preview <code className="font-semibold text-sm text-ink normal-case tracking-normal">{localPreview || "—"}</code></span>
          {nextPreview && <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted">Next allocated <code className="font-semibold text-sm text-ink normal-case tracking-normal">{nextPreview}</code></span>}
        </div>
        <form onSubmit={save} className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="grid grid-cols-[1.2rem_8rem_minmax(0,1fr)_auto] gap-2 items-end border border-border rounded-md p-2">
              <span className="text-xs font-mono text-ink-muted pb-2">{index + 1}</span>
              <CrmField label="Type"><CrmSelect value={segment.type} onChange={(e) => setType(index, e.target.value)}><option value="FIXED">Fixed text</option><option value="DATE">Date</option><option value="SERIAL">Serial</option></CrmSelect></CrmField>
              {segment.type === "FIXED" ? <CrmField label="Text"><CrmInput value={segment.fixed_text || ""} onChange={(e) => update(index, { fixed_text: e.target.value })} placeholder="PSG-" /></CrmField> : segment.type === "DATE" ? <CrmField label="Date format"><CrmSelect value={segment.date_format || "YYYY"} onChange={(e) => update(index, { date_format: e.target.value })}>{["DD", "MM", "YY", "YYYY", "Mmm", "MMM"].map((value) => <option key={value} value={value}>{value}</option>)}</CrmSelect></CrmField> : <div className="grid grid-cols-2 gap-2"><CrmField label="Width"><CrmInput type="number" min="1" max="12" value={segment.width || 6} onChange={(e) => update(index, { width: Number(e.target.value) })} /></CrmField><CrmField label="Reset"><CrmSelect value={segment.reset_interval || ""} onChange={(e) => update(index, { reset_interval: e.target.value })}><option value="">Never</option><option value="DAILY">Daily</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></CrmSelect></CrmField></div>}
              <div className="flex gap-1"><CrmButton type="button" variant="ghost" size="icon-sm" onClick={() => move(index, -1)} disabled={index === 0} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></CrmButton><CrmButton type="button" variant="ghost" size="icon-sm" onClick={() => move(index, 1)} disabled={index === segments.length - 1} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></CrmButton><CrmButton type="button" variant="danger" size="icon-sm" onClick={() => setSegments((items) => items.filter((_, i) => i !== index))} title="Remove"><Trash2 className="w-3.5 h-3.5" /></CrmButton></div>
            </div>
          ))}
          <div className="flex gap-2 pt-2"><CrmButton type="button" variant="outline" onClick={() => setSegments((items) => [...items, { ...emptySegment }])}><Plus className="w-3.5 h-3.5" /> Add segment</CrmButton><CrmButton type="button" variant="ghost" onClick={() => setSegments(DEFAULT_SEGMENTS.map((item) => ({ ...item })))}>Restore default</CrmButton><CrmButton type="submit" loading={saving} disabled={loading}>Save format</CrmButton></div>
        </form>
      </CrmCard>
    </div>
  );
}
