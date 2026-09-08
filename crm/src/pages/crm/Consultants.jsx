import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { clearSession, getUser } from "@/lib/api";
import { apiErrorMessage } from "@/lib/utils";
import Stamp from "@/components/Stamp";
import { Users2, UserX, UserCheck, Pencil, Plus } from "lucide-react";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard, CrmCardHeader } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState } from "@/hooks/useListQueryState";

const FILTER_KEYS = [];
const LIST_DEFAULTS = {};

const AUDIT_ACTION_LABELS = {
  staff_created: "Created",
  staff_updated: "Updated",
  staff_deactivated: "Deactivated",
  staff_activated: "Activated",
};

function isConsultantActive(row) {
  if (typeof row?.is_active === "boolean") return row.is_active;
  return row?.active !== false;
}

function formatAuditValue(value) {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatAuditDiff(row) {
  const before = row?.before && typeof row.before === "object" ? row.before : {};
  const after = row?.after && typeof row.after === "object" ? row.after : {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (!keys.length) return "—";
  return keys
    .map((key) => `${key}: ${formatAuditValue(before[key])} → ${formatAuditValue(after[key])}`)
    .join("; ");
}

export default function Consultants() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });
  const nav = useNavigate();
  const me = getUser();
  const myId = me?.id;
  const [rows, setRows] = useState([]);
  const [formMode, setFormMode] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [reassignCtx, setReassignCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (list.q) params.q = list.q;
    api.get("/admin/consultants", { params }).then((r) => {
      setRows(Array.isArray(r.data) ? r.data : (r.data?.items || []));
      setLoading(false);
    }).catch(() => { setRows([]); setLoading(false); });
  }, [list.q]);

  const loadAudit = useCallback(() => {
    setAuditLoading(true);
    api.get("/admin/consultants/audit", { params: { limit: 40 } }).then((r) => {
      setAuditRows(Array.isArray(r.data) ? r.data : []);
      setAuditLoading(false);
    }).catch(() => { setAuditRows([]); setAuditLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAudit(); }, [loadAudit]);

  const refresh = () => {
    load();
    loadAudit();
  };

  const handleCloseForm = () => {
    setFormMode(null);
    setEditingUser(null);
  };

  const create = async (form) => {
    try {
      await api.post("/admin/consultants", form);
      toast.success("User created");
      handleCloseForm();
      refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to create user"));
    }
  };

  const update = async (form) => {
    if (!editingUser?.id) return;
    try {
      const r = await api.patch(`/admin/consultants/${editingUser.id}`, form);
      if (r.data?.requires_reassignment) {
        setReassignCtx({
          mode: "edit-countries",
          cid: editingUser.id,
          codes: form.country_codes,
          message: r.data.message,
          blocked: r.data.blocked_countries || [],
        });
        return;
      }
      toast.success("User updated");
      const roleChanged = form.role && form.role !== editingUser.role;
      handleCloseForm();
      refresh();
      if (roleChanged && editingUser.id === myId) {
        toast.message("Your role changed. Please sign in again.");
        clearSession();
        nav("/login");
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to update user"));
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
      toast.success("Countries updated");
      refresh();
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
      toast.success("User deactivated");
      refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to deactivate"));
    }
  };

  const activate = async (cid, name) => {
    if (!window.confirm(`Activate ${name}?`)) return;
    try {
      await api.patch(`/admin/consultants/${cid}/activate`);
      toast.success("User activated");
      refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to activate"));
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
      setReassignCtx(null);
      refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Reassignment failed"));
    }
  };

  const updateManager = async (cid, managerId) => {
    try {
      await api.patch(`/admin/consultants/${cid}/manager`, { manager_id: managerId || null });
      toast.success("Manager updated");
      refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to update manager"));
    }
  };

  const isUnrestricted = (row) => Boolean(row?.unrestricted_scope || row?.role === "admin");
  const activeAdminCount = rows.filter((row) => isConsultantActive(row) && isUnrestricted(row)).length;

  const canDeactivate = (row) => {
    if (!isConsultantActive(row)) return false;
    if (row.id === myId) return false;
    if (isUnrestricted(row) && activeAdminCount <= 1) return false;
    return true;
  };

  const deactivateTitle = (row) => {
    if (row.id === myId) return "You cannot deactivate your own account";
    if (isUnrestricted(row) && activeAdminCount <= 1) return "Cannot deactivate the last remaining admin";
    return "Deactivate";
  };

  const columns = [
    {
      key: "full_name",
      label: "User",
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
      render: (row) => <Stamp tone={isUnrestricted(row) ? "gold" : "ink"} size="sm">{row.role_name || row.role}</Stamp>,
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
          {isUnrestricted(row) ? <Stamp tone="muted" size="sm">All</Stamp>
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
      render: (row) => {
        const active = isConsultantActive(row);
        const allowInline = active && !isUnrestricted(row);
        return (
          <div className="inline-flex gap-2 items-center flex-wrap justify-end">
            {allowInline && (
              <>
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
              </>
            )}
            <CrmButton
              variant="outline"
              size="icon-sm"
              onClick={() => { setFormMode("edit"); setEditingUser(row); }}
              data-testid={`edit-user-${row.id.slice(0, 4)}`}
              title="Edit user"
              aria-label={`Edit ${row.full_name || "user"}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </CrmButton>
            {active ? (
              <span title={deactivateTitle(row)}>
                <CrmButton
                  variant="danger"
                  size="icon-sm"
                  disabled={!canDeactivate(row)}
                  onClick={() => deactivate(row.id, row.full_name)}
                  data-testid={`deactivate-${row.id.slice(0, 4)}`}
                  title={deactivateTitle(row)}
                  aria-label={`Deactivate ${row.full_name || "user"}`}
                >
                  <UserX className="w-3.5 h-3.5" />
                </CrmButton>
              </span>
            ) : (
              <CrmButton
                variant="success"
                size="icon-sm"
                onClick={() => activate(row.id, row.full_name)}
                data-testid={`activate-${row.id.slice(0, 4)}`}
                title="Activate"
                aria-label={`Activate ${row.full_name || "user"}`}
              >
                <UserCheck className="w-3.5 h-3.5" />
              </CrmButton>
            )}
          </div>
        );
      },
    },
  ];

  const auditColumns = [
    {
      key: "created_at",
      label: "When",
      render: (row) => (
        <span className="text-xs text-ink-muted">
          {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "actor_id",
      label: "Changed by",
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-ink">{row.actor_name || "Unknown"}</div>
          <div className="text-[10px] font-mono text-ink-muted">{row.actor_id || "—"}</div>
        </div>
      ),
    },
    {
      key: "entity_id",
      label: "User",
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-ink">{row.entity_name || "—"}</div>
          <div className="text-[10px] font-mono text-ink-muted">{row.entity_id || "—"}</div>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <Stamp tone="muted" size="sm">{AUDIT_ACTION_LABELS[row.action] || row.action}</Stamp>
      ),
    },
    {
      key: "after",
      label: "Settings changed",
      sortable: false,
      render: (row) => <span className="text-xs text-ink-muted">{formatAuditDiff(row)}</span>,
    },
  ];

  return (
    <div className="p-6 relative">
      <PageHeader
        label="Admin"
        title="User Master"
        actions={
          <CrmButton
            variant="solid"
            size="sm"
            onClick={() => { setFormMode("create"); setEditingUser(null); }}
            data-testid="new-consultant-btn"
            aria-label="Create new user"
          >
            <Plus className="w-3.5 h-3.5" /> New user
          </CrmButton>
        }
      />

      {formMode && (
        <UserForm
          mode={formMode}
          user={editingUser}
          onCancel={handleCloseForm}
          onSubmit={formMode === "edit" ? update : create}
        />
      )}

      <FilterPanel
        fields={[]}
        values={{}}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search users…"
        testId="consultants-filters"
      />

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          rowTestId={(row) => `consultant-row-${row.id.slice(0, 4)}`}
          empty={{ icon: Users2, title: "No users found" }}
        />
      </CrmTableCard>

      <CrmTableCard className="mt-6">
        <CrmCardHeader label="Audit" title="Change history" />
        <DataTable
          columns={auditColumns}
          data={auditRows}
          loading={auditLoading}
          empty={{ icon: Users2, title: "No user setting changes recorded yet" }}
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

function UserForm({ mode, user, onCancel, onSubmit }) {
  const isEdit = mode === "edit";
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.full_name || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "consultant");
  const [countryCodes, setCountryCodes] = useState(user?.country_codes || []);
  const [managerId, setManagerId] = useState(user?.manager_id || null);
  const [submitting, setSubmitting] = useState(false);
  const [roleOptions, setRoleOptions] = useState([
    { value: "consultant", label: "Consultant" },
    { value: "admin", label: "Admin" },
  ]);
  const [roleMeta, setRoleMeta] = useState({});
  const currentRole = user?.role;
  const currentRoleName = user?.role_name;

  useEffect(() => {
    api.get("/admin/roles", { params: { active: true } }).then((r) => {
      const items = Array.isArray(r.data) ? r.data : [];
      if (!items.length) return;
      const options = items.map((item) => ({ value: item.slug, label: item.name }));
      if (currentRole && !options.some((opt) => opt.value === currentRole)) {
        options.push({ value: currentRole, label: currentRoleName || currentRole });
      }
      setRoleOptions(options);
      setRoleMeta(Object.fromEntries(items.map((item) => [item.slug, item])));
    }).catch(() => {});
  }, [currentRole, currentRoleName]);

  const selectedRole = roleMeta[role] || {};
  const needsCountries = !selectedRole.unrestricted_scope && role !== "admin";

  const submit = async (e) => {
    e.preventDefault();
    if (needsCountries && countryCodes.length === 0) {
      toast.error("Select at least one country for this role");
      return;
    }
    if (!isEdit && (!password || password.length < 6)) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (isEdit && password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        email: email.trim(),
        full_name: name.trim(),
        role,
        country_codes: needsCountries ? countryCodes : [],
        manager_id: managerId || null,
      };
      if (!isEdit || password) payload.password = password;
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface-card border border-border rounded-[10px] p-5 mb-5 shadow-[var(--shadow-card)]" data-testid={isEdit ? "edit-user-form" : "new-consultant-form"}>
      <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-4">
        {isEdit ? "Edit staff account" : "New staff account"}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <CrmField label="Email" required>
          <CrmInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="nc-email" placeholder="staff@amaravisa.com" autoComplete="off" />
        </CrmField>
        <CrmField label="Full name" required>
          <CrmInput required value={name} onChange={(e) => setName(e.target.value)} data-testid="nc-name" placeholder="Priya Sharma" />
        </CrmField>
        <CrmField
          label={isEdit ? "New password" : "Temporary password"}
          required={!isEdit}
          hint={isEdit ? "Leave blank to keep the current password" : "Min. 6 characters — share securely with the staff member"}
        >
          <CrmInput
            type="password"
            required={!isEdit}
            minLength={isEdit ? undefined : 6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="nc-password"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </CrmField>
        <CrmField label="Role">
          <SearchableSelect
            clearable={false}
            value={role}
            onChange={(next) => {
              const nextRole = next || "consultant";
              setRole(nextRole);
              if (roleMeta[nextRole]?.unrestricted_scope || nextRole === "admin") setCountryCodes([]);
            }}
            data-testid="nc-role"
            options={roleOptions}
          />
        </CrmField>
        {needsCountries && (
          <>
            <CrmField label="Manager (optional)" hint="Reporting line — managers see this consultant's data">
              <ConsultantSelect
                value={managerId}
                onChange={setManagerId}
                admin
                excludeId={user?.id}
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
            {submitting ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save user" : "Create user")}
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
