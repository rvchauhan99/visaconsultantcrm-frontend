import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Check, X, FormInput, Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { DataTable } from "@/components/ui/data-table";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { useListQueryState } from "@/hooks/useListQueryState";
import { previewMasterKey } from "@/lib/keys";

const TYPES = ["text", "date", "dropdown", "number"];
const emptyForm = { default_label: "", default_field_type: "text", default_options: "", default_required: true, is_basic: false, active: true };
const FILTER_KEYS = ["active"];
const LIST_DEFAULTS = {};

export default function FieldMaster() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (list.q) params.q = list.q;
    if (list.filters.active != null && list.filters.active !== "") params.active = list.filters.active;
    api.get("/admin/field-master", { params })
      .then((r) => { setRows(r.data); setLoading(false); })
      .catch(() => { setRows([]); setLoading(false); });
  }, [list.q, list.filters]);

  useEffect(() => { load(); }, [load]);

  const filterFields = useMemo(() => [
    {
      key: "active",
      label: "Status",
      type: "select",
      options: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
  ], []);

  const existingKeys = useMemo(() => rows.map((r) => r.field_key), [rows]);
  const previewKey = useMemo(
    () => previewMasterKey(form.default_label, existingKeys, "field"),
    [form.default_label, existingKeys],
  );

  const create = async (e) => {
    e.preventDefault();
    if (!form.default_label.trim()) return toast.error("Label required");
    try {
      await api.post("/admin/field-master", {
        default_label: form.default_label,
        default_field_type: form.default_field_type,
        default_required: form.default_required,
        is_basic: form.is_basic,
        active: form.active,
        default_options: form.default_field_type === "dropdown" ? form.default_options.split(",").map((s) => s.trim()).filter(Boolean) : null,
      });
      toast.success("Created");
      setForm(emptyForm); setShowNew(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const saveEdit = async () => {
    try {
      await api.patch(`/admin/field-master/${editing.id}`, {
        default_label: editing.default_label,
        default_field_type: editing.default_field_type,
        default_options: editing.default_field_type === "dropdown"
          ? (Array.isArray(editing.default_options) ? editing.default_options : String(editing.default_options || "").split(",").map((s) => s.trim()).filter(Boolean))
          : null,
        default_required: editing.default_required,
        is_basic: editing.is_basic,
        active: editing.active,
      });
      toast.success("Updated"); setEditing(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const columns = [
    {
      key: "field_key",
      label: "Field Key",
      render: (row) => editing?.id === row.id ? (
        <CrmInput value={editing.field_key} disabled data-testid="edit-field-key" className="font-mono text-xs" />
      ) : (
        <span className="font-mono text-ink text-xs font-semibold">{row.field_key}</span>
      ),
    },
    {
      key: "default_label",
      label: "Label",
      render: (row) => editing?.id === row.id ? (
        <CrmInput value={editing.default_label} onChange={(e) => setEditing({ ...editing, default_label: e.target.value })} data-testid="edit-label" />
      ) : <span className="font-medium text-ink">{row.default_label}</span>,
    },
    {
      key: "default_field_type",
      label: "Type & Options",
      sortable: false,
      render: (row) => editing?.id === row.id ? (
        <div className="space-y-1 w-36">
          <SearchableSelect
            clearable={false}
            value={editing.default_field_type}
            onChange={(v) => setEditing({ ...editing, default_field_type: v || TYPES[0] })}
            data-testid="edit-type"
            options={TYPES.map((t) => ({ value: t, label: t }))}
          />
          {editing.default_field_type === "dropdown" && (
            <CrmInput value={editing.default_options} onChange={(e) => setEditing({ ...editing, default_options: e.target.value })} placeholder="opt1,opt2" data-testid="edit-opts" />
          )}
        </div>
      ) : (
        <div>
          <Stamp tone="navy" size="sm">{row.default_field_type}</Stamp>
          {row.default_field_type === "dropdown" && row.default_options && (
            <div className="text-[10px] font-mono text-ink-muted mt-1 truncate max-w-xs">{row.default_options.join(", ")}</div>
          )}
        </div>
      ),
    },
    {
      key: "flags",
      label: "Flags",
      sortable: false,
      render: (row) => editing?.id === row.id ? (
        <div className="space-y-1 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={editing.default_required} onChange={(e) => setEditing({ ...editing, default_required: e.target.checked })} data-testid="edit-req" /> Required</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={editing.is_basic} onChange={(e) => setEditing({ ...editing, is_basic: e.target.checked })} data-testid="edit-basic" /> Basic</label>
        </div>
      ) : (
        <div className="flex flex-col gap-1 items-start">
          {row.default_required && <Stamp tone="navy" size="sm" className="!text-[9px]">required</Stamp>}
          {row.is_basic && <Stamp tone="muted" size="sm" className="!text-[9px]">basic</Stamp>}
        </div>
      ),
    },
    {
      key: "active",
      label: "Status",
      render: (row) => editing?.id === row.id ? (
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} data-testid="edit-active" /> Active</label>
      ) : (
        <Stamp tone={row.active ? "success" : "danger"} size="sm">{row.active ? "active" : "inactive"}</Stamp>
      ),
    },
    {
      key: "_actions",
      label: "",
      sortable: false,
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => editing?.id === row.id ? (
        <div className="inline-flex gap-1">
          <CrmButton variant="success" size="icon-sm" onClick={saveEdit} data-testid="edit-save"><Check className="w-3.5 h-3.5" /></CrmButton>
          <CrmButton variant="outline" size="icon-sm" onClick={() => setEditing(null)} data-testid="edit-cancel"><X className="w-3.5 h-3.5" /></CrmButton>
        </div>
      ) : (
        <CrmButton variant="outline" size="icon-sm" onClick={() => setEditing({ ...row, default_options: row.default_options?.join(",") || "" })} data-testid={`edit-btn-${row.field_key}`} title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </CrmButton>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        label="Admin"
        title="Field master"
        actions={
          <CrmButton variant="solid" size="sm" onClick={() => setShowNew((s) => !s)} data-testid="new-field-btn">
            <Plus className="w-3.5 h-3.5" /> New field
          </CrmButton>
        }
      />

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search fields…"
        testId="field-master-filters"
      />

      {showNew && (
        <form onSubmit={create} className="bg-surface-card border border-border rounded-[10px] p-5 mb-5 shadow-[var(--shadow-card)]" data-testid="new-field-form">
          <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-4">Create Master Field</div>
          <div className="grid md:grid-cols-4 gap-4">
            <CrmField label="Label" required>
              <CrmInput required value={form.default_label} onChange={(e) => setForm({ ...form, default_label: e.target.value })} placeholder="e.g. Passport Number" data-testid="field-label-input" />
            </CrmField>
            <CrmField label="Key (auto-generated)">
              <CrmInput value={form.default_label.trim() ? previewKey : ""} disabled placeholder="from label…" data-testid="field-key-input" className="font-mono text-xs" />
            </CrmField>
            <CrmField label="Type">
              <SearchableSelect
                clearable={false}
                value={form.default_field_type}
                onChange={(v) => setForm({ ...form, default_field_type: v || TYPES[0] })}
                data-testid="field-type-input"
                options={TYPES.map((t) => ({ value: t, label: t }))}
              />
            </CrmField>
            <CrmField label="Options (csv)">
              <CrmInput value={form.default_options} onChange={(e) => setForm({ ...form, default_options: e.target.value })} disabled={form.default_field_type !== "dropdown"} placeholder="opt1,opt2" data-testid="field-opts-input" />
            </CrmField>
            <div className="md:col-span-3 flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-ink-muted"><input type="checkbox" checked={form.default_required} onChange={(e) => setForm({ ...form, default_required: e.target.checked })} data-testid="field-req-input" className="rounded" /> Required</label>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted"><input type="checkbox" checked={form.is_basic} onChange={(e) => setForm({ ...form, is_basic: e.target.checked })} data-testid="field-basic-input" className="rounded" /> Basic info field</label>
            </div>
            <div className="flex justify-end">
              <CrmButton type="submit" variant="solid" size="sm" data-testid="field-submit">Create</CrmButton>
            </div>
          </div>
        </form>
      )}

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          rowTestId={(row) => `field-row-${row.field_key}`}
          empty={{ icon: FormInput, title: "No fields configured" }}
        />
      </CrmTableCard>
    </div>
  );
}
