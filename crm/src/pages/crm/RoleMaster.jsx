import React, { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { apiErrorMessage } from "@/lib/utils"
import Stamp from "@/components/Stamp"
import { Pencil, Plus, Shield } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { CrmButton } from "@/components/ui/crm-button"
import { CrmTableCard } from "@/components/ui/crm-card"
import { CrmField, CrmInput } from "@/components/ui/crm-field"
import { DataTable } from "@/components/ui/data-table"

function groupCatalog(catalog) {
  const groups = []
  const index = {}
  for (const item of catalog) {
    if (!index[item.group_id]) {
      index[item.group_id] = { id: item.group_id, label: item.group, items: [] }
      groups.push(index[item.group_id])
    }
    index[item.group_id].items.push(item)
  }
  return groups
}

export default function RoleMaster() {
  const [rows, setRows] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get("/admin/roles"),
      api.get("/admin/roles/catalog"),
    ]).then(([rolesRes, catalogRes]) => {
      setRows(Array.isArray(rolesRes.data) ? rolesRes.data : [])
      setCatalog(Array.isArray(catalogRes.data) ? catalogRes.data : [])
      setLoading(false)
    }).catch(() => {
      setRows([])
      setCatalog([])
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  const groups = useMemo(() => groupCatalog(catalog), [catalog])

  const handleNew = () => {
    setForm({
      mode: "create",
      name: "",
      slug: "",
      menu_keys: [],
    })
  }

  const handleEdit = (row) => {
    setForm({
      mode: "edit",
      id: row.id,
      name: row.name,
      slug: row.slug,
      is_system: row.is_system,
      unrestricted_scope: row.unrestricted_scope,
      menu_keys: [...(row.menu_keys || [])],
    })
  }

  const handleToggleMenu = (key) => {
    setForm((prev) => {
      if (!prev) return prev
      const has = prev.menu_keys.includes(key)
      return {
        ...prev,
        menu_keys: has ? prev.menu_keys.filter((item) => item !== key) : [...prev.menu_keys, key],
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    try {
      if (form.mode === "create") {
        await api.post("/admin/roles", {
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          menu_keys: form.menu_keys,
        })
        toast.success("Role created")
      } else {
        await api.patch(`/admin/roles/${form.id}`, {
          name: form.name.trim(),
          menu_keys: form.menu_keys,
        })
        toast.success("Role updated")
      }
      setForm(null)
      load()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save role"))
    }
  }

  const columns = [
    {
      key: "name",
      label: "Role",
      render: (row) => (
        <div>
          <div className="font-medium text-ink">{row.name}</div>
          <div className="text-[10px] font-mono text-ink-muted">{row.slug}</div>
        </div>
      ),
    },
    {
      key: "is_system",
      label: "Type",
      render: (row) => row.is_system
        ? <Stamp tone="gold" size="sm">System</Stamp>
        : <Stamp tone="ink" size="sm">Custom</Stamp>,
    },
    {
      key: "menu_keys",
      label: "Menus",
      render: (row) => <span className="text-xs text-ink-muted">{(row.menu_keys || []).length} assigned</span>,
    },
    {
      key: "unrestricted_scope",
      label: "Data",
      render: (row) => row.unrestricted_scope
        ? <Stamp tone="muted" size="sm">All countries</Stamp>
        : <span className="text-xs text-ink-muted">User countries</span>,
    },
    {
      key: "active",
      label: "Status",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${row.active ? "status-dot-success" : "status-dot-danger"}`} />
          <span className="text-xs">{row.active ? "Active" : "Inactive"}</span>
        </div>
      ),
    },
    {
      key: "_actions",
      label: "",
      sortable: false,
      className: "text-right",
      render: (row) => (
        <CrmButton
          variant="outline"
          size="icon-sm"
          onClick={() => handleEdit(row)}
          aria-label={`Edit ${row.name}`}
          data-testid={`edit-role-${row.slug}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </CrmButton>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        label="Admin"
        title="Role Master"
        actions={
          <CrmButton variant="solid" size="sm" onClick={handleNew} data-testid="new-role-btn" aria-label="Create role">
            <Plus className="w-3.5 h-3.5" /> New role
          </CrmButton>
        }
      />

      {form && (
        <form onSubmit={handleSubmit} className="bg-surface-card border border-border rounded-[10px] p-5 mb-5 shadow-[var(--shadow-card)]" data-testid="role-form">
          <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-4">
            {form.mode === "edit" ? "Edit role" : "New role"}
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <CrmField label="Name" required>
              <CrmInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="role-name" />
            </CrmField>
            <CrmField label="Slug" required hint={form.mode === "edit" ? "Slug cannot change after create" : "lowercase-hyphenated"}>
              <CrmInput
                value={form.slug}
                disabled={form.mode === "edit"}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                data-testid="role-slug"
                placeholder="operations-lead"
              />
            </CrmField>
          </div>
          <div className="text-xs font-semibold text-ink mb-2">Assigned menus</div>
          <div className="grid md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <div key={group.id} className="border border-border rounded-lg p-3">
                <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">{group.label}</div>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={form.menu_keys.includes(item.key)}
                        onChange={() => handleToggleMenu(item.key)}
                        data-testid={`role-menu-${item.key}`}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {form.unrestricted_scope && (
            <p className="text-xs text-ink-muted mt-3">System Admin keeps org-wide data access. Country assignment stays on the user for every other role.</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <CrmButton type="button" variant="outline" size="sm" onClick={() => setForm(null)}>Cancel</CrmButton>
            <CrmButton type="submit" variant="solid" size="sm" data-testid="role-save">{form.mode === "edit" ? "Save role" : "Create role"}</CrmButton>
          </div>
        </form>
      )}

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          empty={{ icon: Shield, title: "No roles found" }}
        />
      </CrmTableCard>
    </div>
  )
}
