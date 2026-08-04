import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/utils";
import Stamp from "@/components/Stamp";
import { Users2, UserX, Plus } from "lucide-react";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState } from "@/hooks/useListQueryState";

const FILTER_KEYS = [];
const LIST_DEFAULTS = {};

function isConsultantActive(row) {
  if (typeof row?.is_active === "boolean") return row.is_active;
  return row?.active !== false;
}

export default function Consultants() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });
  const [rows, setRows] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [reassignCtx, setReassignCtx] = useState(null); // { mode, cid, name, message, blocked, codes? }
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (list.q) params.q = list.q;
    api.get("/admin/consultants", { params }).then((r) => {
      setRows(Array.isArray(r.data) ? r.data : (r.data?.items || []));
      setLoading(false);
    }).catch(() => { setRows([]); setLoading(false); });
  }, [list.q]);

  useEffect(() => { load(); }, [load]);

  const create = async (form) => {
    try {
      await api.post("/admin/consultants", form);
      toast.success("Consultant created");
      setShowNew(false);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to create consultant"));
    }
  };

  const updateCountries = async (cid, codes) => {
    try {
      const r = await api.patch(`/admin/consultants/${cid}/countries`, codes);
      if (r.data.requires_reassignment) {
        setReassignCtx({
          mode: "countries", cid, codes, message: r.data.message, blocked: r.data.blocked_countries || [],
        });
        return;
      }
      toast.success("Countries updated"); load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to update countries"));
    }
  };

  const deactivate = async (cid, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try {
      const r = await api.patch(`/admin/consultants/${cid}/deactivate`);
      if (r.data.requires_reassignment) {
        setReassignCtx({
          mode: "deactivate", cid, name, message: r.data.message, openCases: r.data.open_cases,
        });
        return;
      }
      toast.success("Consultant deactivated"); load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to deactivate"));
    }
  };

  const execReassign = async (targetCid) => {
    try {
      if (reassignCtx.mode === "deactivate") {
        await api.post(`/admin/consultants/${reassignCtx.cid}/reassign-and-deactivate`, {
          target_consultant_id: targetCid,
        });
        toast.success("Reassigned & deactivated");
      } else {
        await api.post(`/admin/consultants/${reassignCtx.cid}/reassign-and-update-countries`, {
          target_consultant_id: targetCid,
          new_country_codes: reassignCtx.codes,
        });
        toast.success("Reassigned & countries updated");
      }
      setReassignCtx(null); load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Reassignment failed"));
    }
  };

  const updateManager = async (cid, managerId) => {
    try {
      await api.patch(`/admin/consultants/${cid}/manager`, { manager_id: managerId || null });
      toast.success("Manager updated");
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to update manager"));
    }
  };

  const columns = [
    {
      key: "full_name",
      label: "Consultant",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-surface-muted border border-border flex items-center justify-center text-xs font-bold text-ink-muted shrink-0">
            {(row.full_name || "?").split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
          </span>
          <div>
            <div className="font-medium text-ink leading-tight">{row.full_name}</div>
            <div className="text-[10px] font-mono text-ink-muted">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <Stamp tone={row.role === "admin" ? "gold" : "ink"} size="sm">{row.role}</Stamp>,
    },
    {
      key: "manager_name",
      label: "Manager",
      render: (row) => (
        <span className="text-xs text-ink-muted">{row.manager_name || "—"}</span>
      ),
    },
    {
      key: "direct_reports_count",
      label: "Team",
      render: (row) => (
        row.direct_reports_count > 0
          ? <Stamp tone="muted" size="sm">{row.direct_reports_count} reports</Stamp>
          : <span className="text-ink-muted text-xs">—</span>
      ),
    },
    {
      key: "country_codes",
      label: "Countries managed",
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {row.role === "admin" ? <Stamp tone="muted" size="sm">All</Stamp>
          : row.country_codes?.length > 0 ? row.country_codes.map((c) => <Stamp key={c} tone="ink" size="sm">{c}</Stamp>)
          : <span className="text-ink-muted italic text-xs">None</span>}
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (row) => {
        const active = isConsultantActive(row);
        return (
          <div className="flex items-center gap-1.5">
            <span className={`status-dot ${active ? "status-dot-success" : "status-dot-danger"}`} />
            <span className="text-xs">{active ? "Active" : "Inactive"}</span>
          </div>
        );
      },
    },
    {
      key: "_actions",
      label: "",
      sortable: false,
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => isConsultantActive(row) && row.role !== "admin" ? (
        <div className="inline-flex gap-2 items-center flex-wrap justify-end">
          <ConsultantSelect
            value={row.manager_id || null}
            onChange={(v) => updateManager(row.id, v)}
            admin
            excludeId={row.id}
            placeholder="Manager…"
            testId={`edit-manager-${row.id.slice(0, 4)}`}
            className="w-36"
          />
          <CountrySelect
            value={row.country_codes || []}
            onChange={(codes) => updateCountries(row.id, codes)}
            multiple
            placeholder="Edit…"
            testId={`edit-countries-${row.id.slice(0, 4)}`}
            className="w-32"
          />
          <CrmButton variant="danger" size="icon-sm" onClick={() => deactivate(row.id, row.full_name)} data-testid={`deactivate-${row.id.slice(0, 4)}`} title="Deactivate">
            <UserX className="w-3.5 h-3.5" />
          </CrmButton>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="p-6 relative">
      <PageHeader
        label="Admin"
        title="Consultants"
        actions={
          <CrmButton variant="solid" size="sm" onClick={() => setShowNew(true)} data-testid="new-consultant-btn">
            <Plus className="w-3.5 h-3.5" /> New consultant
          </CrmButton>
        }
      />

      {showNew && <NewConsultantForm onCancel={() => setShowNew(false)} onCreate={create} />}

      <FilterPanel
        fields={[]}
        values={{}}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search consultants…"
        testId="consultants-filters"
      />

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          rowTestId={(row) => `consultant-row-${row.id.slice(0, 4)}`}
          empty={{ icon: Users2, title: "No consultants found" }}
        />
      </CrmTableCard>

      {reassignCtx && (
        <ReassignOverlay
          ctx={reassignCtx}
          onCancel={() => setReassignCtx(null)}
          onConfirm={execReassign}
        />
      )}
    </div>
  );
}

function NewConsultantForm({ onCancel, onCreate }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("consultant");
  const [countryCodes, setCountryCodes] = useState([]);
  const [managerId, setManagerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (role === "consultant" && countryCodes.length === 0) {
      toast.error("Select at least one country for a consultant");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        email: email.trim(),
        full_name: name.trim(),
        password,
        role,
        country_codes: role === "admin" ? [] : countryCodes,
        manager_id: managerId || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface-card border border-border rounded-[10px] p-5 mb-5 shadow-[var(--shadow-card)]" data-testid="new-consultant-form">
      <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-4">New staff account</div>
      <div className="grid md:grid-cols-2 gap-3">
        <CrmField label="Email" required>
          <CrmInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="nc-email" placeholder="staff@amaravisa.com" autoComplete="off" />
        </CrmField>
        <CrmField label="Full name" required>
          <CrmInput required value={name} onChange={(e) => setName(e.target.value)} data-testid="nc-name" placeholder="Priya Sharma" />
        </CrmField>
        <CrmField label="Temporary password" required hint="Min. 6 characters — share securely with the staff member">
          <CrmInput type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="nc-password" placeholder="••••••••" autoComplete="new-password" />
        </CrmField>
        <CrmField label="Role">
          <SearchableSelect
            clearable={false}
            value={role}
            onChange={(next) => {
              setRole(next || "consultant");
              if (next === "admin") setCountryCodes([]);
            }}
            data-testid="nc-role"
            options={[
              { value: "consultant", label: "Consultant" },
              { value: "admin", label: "Admin" },
            ]}
          />
        </CrmField>
        {role === "consultant" && (
          <>
            <CrmField label="Manager (optional)" hint="Reporting line — managers see this consultant's data">
              <ConsultantSelect
                value={managerId}
                onChange={setManagerId}
                admin
                placeholder="Select manager…"
                testId="nc-manager"
              />
            </CrmField>
            <CrmField label="Countries managed" required className="md:col-span-2" hint="Consultants only see cases for these destinations">
            <CountrySelect
              value={countryCodes}
              onChange={setCountryCodes}
              multiple
              placeholder="Select countries…"
              testId="nc-countries"
            />
          </CrmField>
          </>
        )}
        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
          <CrmButton type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>Cancel</CrmButton>
          <CrmButton type="submit" variant="solid" size="sm" data-testid="nc-submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create consultant"}
          </CrmButton>
        </div>
      </div>
    </form>
  );
}

function ReassignOverlay({ ctx, onCancel, onConfirm }) {
  const [target, setTarget] = useState("");
  return (
    <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-border rounded-[10px] shadow-[var(--shadow-lift)] max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-ink mb-2">Reassignment required</h2>
        <p className="text-sm text-ink-muted mb-4">{typeof ctx.message === "string" ? ctx.message : "Reassign open cases before continuing."}</p>
        <CrmField label="Reassign affected cases to">
          <ConsultantSelect
            value={target}
            onChange={setTarget}
            admin
            excludeId={ctx.cid}
            placeholder="Select consultant…"
            testId="reassign-target-select"
          />
        </CrmField>
        <div className="flex justify-end gap-2 mt-6">
          <CrmButton variant="outline" onClick={onCancel}>Cancel</CrmButton>
          <CrmButton variant="solid" disabled={!target} onClick={() => onConfirm(target)} data-testid="reassign-confirm">
            Confirm &amp; proceed
          </CrmButton>
        </div>
      </div>
    </div>
  );
}
