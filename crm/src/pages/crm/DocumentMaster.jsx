import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Check, X, FileText, Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { DataTable } from "@/components/ui/data-table";
import { CrmField, CrmInput, CrmSelect } from "@/components/ui/crm-field";
import { useListQueryState } from "@/hooks/useListQueryState";
import { previewMasterKey } from "@/lib/keys";

const CATEGORIES = ["identity", "financial", "travel", "other"];
const ALLOWED_FORMATS = ["pdf", "jpg", "png"];
const FILTER_KEYS = ["active"];
const LIST_DEFAULTS = {};

const emptyForm = {
  default_name: "", default_description: "",
  default_formats_allowed: ["pdf", "jpg", "png"], default_max_file_size_mb: 5,
  default_required: true, vault_eligible: false, is_basic: false,
  category: "other", active: true,
};

function toggleFormat(list, fmt) {
  const set = new Set(list || []);
  if (set.has(fmt)) set.delete(fmt);
  else set.add(fmt);
  return ALLOWED_FORMATS.filter((f) => set.has(f));
}

function FormatCheckboxes({ value, onChange, testIdPrefix = "doc-fmt" }) {
  const selected = value || [];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1" data-testid={`${testIdPrefix}-input`}>
      {ALLOWED_FORMATS.map((fmt) => (
        <label key={fmt} className="flex items-center gap-1.5 text-xs text-ink-muted font-mono uppercase">
          <input
            type="checkbox"
            checked={selected.includes(fmt)}
            onChange={() => onChange(toggleFormat(selected, fmt))}
            data-testid={`${testIdPrefix}-${fmt}`}
            className="rounded"
          />
          {fmt}
        </label>
      ))}
    </div>
  );
}

export default function DocumentMaster() {
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
    api.get("/admin/document-master", { params })
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

  const existingKeys = useMemo(() => rows.map((r) => r.doc_key), [rows]);
  const previewKey = useMemo(
    () => previewMasterKey(form.default_name, existingKeys, "doc"),
    [form.default_name, existingKeys],
  );

  const create = async (e) => {
    e.preventDefault();
    if (!form.default_name.trim()) return toast.error("Name required");
    if (!form.default_formats_allowed?.length) return toast.error("Select at least one format");
    try {
      await api.post("/admin/document-master", {
        ...form,
        default_formats_allowed: form.default_formats_allowed,
      });
      toast.success("Created");
      setForm(emptyForm); setShowNew(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const saveEdit = async () => {
    if (!editing.default_formats_allowed?.length) return toast.error("Select at least one format");
    try {
      await api.patch(`/admin/document-master/${editing.id}`, {
        default_name: editing.default_name,
        default_description: editing.default_description,
        default_formats_allowed: editing.default_formats_allowed,
        default_max_file_size_mb: Number(editing.default_max_file_size_mb),
        default_required: editing.default_required,
        vault_eligible: editing.vault_eligible,
        is_basic: editing.is_basic,
        category: editing.category,
        active: editing.active,
      });
      toast.success("Updated"); setEditing(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const columns = [
    {
      key: "doc_key",
      label: "Document Key",
      render: (row) => editing?.id === row.id ? (
        <CrmInput value={editing.doc_key} disabled data-testid="edit-doc-key" className="font-mono text-xs" />
      ) : (
        <div>
          <div className="font-mono text-ink text-xs font-semibold">{row.doc_key}</div>
          <div className="text-[10px] text-ink-muted">{row.category}</div>
        </div>
      ),
    },
    {
      key: "default_name",
      label: "Display Name & Desc",
      render: (row) => editing?.id === row.id ? (
        <div className="space-y-1">
          <CrmInput value={editing.default_name} onChange={(e) => setEditing({ ...editing, default_name: e.target.value })} data-testid="edit-name" />
          <CrmInput value={editing.default_description} onChange={(e) => setEditing({ ...editing, default_description: e.target.value })} placeholder="Desc..." data-testid="edit-desc" />
        </div>
      ) : (
        <div>
          <div className="font-medium text-ink">{row.default_name}</div>
          <div className="text-xs text-ink-muted max-w-xs truncate">{row.default_description}</div>
        </div>
      ),
    },
    {
      key: "config",
      label: "Config",
      sortable: false,
      render: (row) => editing?.id === row.id ? (
        <div className="space-y-1 min-w-[9rem]">
          <FormatCheckboxes
            value={editing.default_formats_allowed}
            onChange={(next) => setEditing({ ...editing, default_formats_allowed: next })}
            testIdPrefix="edit-fmt"
          />
          <CrmInput type="number" value={editing.default_max_file_size_mb} onChange={(e) => setEditing({ ...editing, default_max_file_size_mb: e.target.value })} data-testid="edit-size" />
        </div>
      ) : (
        <div className="text-[10px] font-mono text-ink-muted">
          <div>{(row.default_formats_allowed || []).join(", ")}</div>
          <div>{row.default_max_file_size_mb}MB max</div>
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
          <label className="flex items-center gap-1"><input type="checkbox" checked={editing.vault_eligible} onChange={(e) => setEditing({ ...editing, vault_eligible: e.target.checked })} data-testid="edit-vault" /> Vault</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={editing.is_basic} onChange={(e) => setEditing({ ...editing, is_basic: e.target.checked })} data-testid="edit-basic" /> Basic</label>
        </div>
      ) : (
        <div className="flex flex-col gap-1 items-start">
          {row.default_required && <Stamp tone="navy" size="sm" className="!text-[9px]">required</Stamp>}
          {row.vault_eligible && <Stamp tone="teal" size="sm" className="!text-[9px]">vault</Stamp>}
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
        <CrmButton
          variant="outline"
          size="icon-sm"
          onClick={() => setEditing({
            ...row,
            default_formats_allowed: Array.isArray(row.default_formats_allowed)
              ? [...row.default_formats_allowed]
              : [],
          })}
          data-testid={`edit-btn-${row.doc_key}`}
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </CrmButton>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        label="Admin"
        title="Document master"
        actions={
          <CrmButton variant="solid" size="sm" onClick={() => setShowNew((s) => !s)} data-testid="new-doc-btn">
            <Plus className="w-3.5 h-3.5" /> New document
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
        searchPlaceholder="Search documents…"
        testId="doc-master-filters"
      />

      {showNew && (
        <form onSubmit={create} className="bg-surface-card border border-border rounded-[10px] p-5 mb-5 shadow-[var(--shadow-card)]" data-testid="new-doc-form">
          <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-4">Create Master Document</div>
          <div className="grid md:grid-cols-4 gap-4">
            <CrmField label="Name" required>
              <CrmInput required value={form.default_name} onChange={(e) => setForm({ ...form, default_name: e.target.value })} placeholder="e.g. Bank Statement" data-testid="doc-name-input" />
            </CrmField>
            <CrmField label="Key (auto-generated)">
              <CrmInput value={form.default_name.trim() ? previewKey : ""} disabled placeholder="from name…" data-testid="doc-key-input" className="font-mono text-xs" />
            </CrmField>
            <CrmField label="Description" className="md:col-span-2"><CrmInput value={form.default_description} onChange={(e) => setForm({ ...form, default_description: e.target.value })} data-testid="doc-desc-input" /></CrmField>
            <CrmField label="Category"><CrmSelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="doc-cat-input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</CrmSelect></CrmField>
            <CrmField label="Formats" required>
              <FormatCheckboxes
                value={form.default_formats_allowed}
                onChange={(next) => setForm({ ...form, default_formats_allowed: next })}
                testIdPrefix="doc-fmt"
              />
            </CrmField>
            <CrmField label="Max Size (MB)"><CrmInput type="number" value={form.default_max_file_size_mb} onChange={(e) => setForm({ ...form, default_max_file_size_mb: e.target.value })} data-testid="doc-sz-input" /></CrmField>
            <div className="flex flex-col justify-end gap-1 pb-1">
              <label className="flex items-center gap-1.5 text-xs text-ink-muted"><input type="checkbox" checked={form.default_required} onChange={(e) => setForm({ ...form, default_required: e.target.checked })} data-testid="doc-req-input" className="rounded" /> Required</label>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted"><input type="checkbox" checked={form.vault_eligible} onChange={(e) => setForm({ ...form, vault_eligible: e.target.checked })} data-testid="doc-vault-input" className="rounded" /> Vault eligible</label>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted"><input type="checkbox" checked={form.is_basic} onChange={(e) => setForm({ ...form, is_basic: e.target.checked })} data-testid="doc-basic-input" className="rounded" /> Basic doc</label>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <CrmButton type="submit" variant="solid" size="sm" data-testid="doc-submit">Create</CrmButton>
            </div>
          </div>
        </form>
      )}

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          rowTestId={(row) => `doc-row-${row.doc_key}`}
          empty={{ icon: FileText, title: "No documents configured" }}
        />
      </CrmTableCard>
    </div>
  );
}
