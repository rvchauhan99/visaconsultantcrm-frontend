import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard, CrmCardHeader, CrmEmptyState } from "@/components/ui/crm-card";
import { CrmField, CrmInput, CrmTextarea } from "@/components/ui/crm-field";
import { DataTable } from "@/components/ui/data-table";

export default function Playbooks() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    country_code: "",
    visa_type: "tourist",
    sla_buffer_days: 2,
    escalation_hours: 24,
    checklist: "",
  });

  const load = () => {
    setLoading(true);
    api.get("/crm/playbooks")
      .then((r) => setRows(r.data || []))
      .catch(() => toast.error("Could not load playbooks"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/crm/playbooks", {
        country_code: form.country_code.trim().toUpperCase(),
        visa_type: form.visa_type,
        sla_buffer_days: Number(form.sla_buffer_days) || 0,
        escalation_hours: Number(form.escalation_hours) || 24,
        checklist: form.checklist
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success("Playbook saved");
      setForm({ ...form, country_code: "", checklist: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    }
  };

  const cols = [
    { key: "country_code", label: "Country" },
    { key: "visa_type", label: "Visa type" },
    { key: "sla_buffer_days", label: "SLA buffer (days)", render: (r) => <span className="font-mono">{r.sla_buffer_days}</span> },
    { key: "escalation_hours", label: "Escalation (h)", render: (r) => <span className="font-mono">{r.escalation_hours}</span> },
    {
      key: "checklist",
      label: "Checklist",
      render: (r) => (r.checklist || []).join(", ") || "—",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        label="Compliance"
        title="Tenant playbooks"
        subtitle="Country and visa workflow defaults for SLA and review checklists"
      />

      <CrmTableCard>
        <CrmCardHeader label="Create" title="New playbook" />
        <form className="p-4 grid md:grid-cols-2 gap-3" onSubmit={create} data-testid="playbook-form">
          <CrmField label="Country code">
            <CrmInput required value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })} placeholder="AE" />
          </CrmField>
          <CrmField label="Visa type">
            <CrmInput required value={form.visa_type} onChange={(e) => setForm({ ...form, visa_type: e.target.value })} />
          </CrmField>
          <CrmField label="SLA buffer days">
            <CrmInput type="number" value={form.sla_buffer_days} onChange={(e) => setForm({ ...form, sla_buffer_days: e.target.value })} />
          </CrmField>
          <CrmField label="Escalation hours">
            <CrmInput type="number" value={form.escalation_hours} onChange={(e) => setForm({ ...form, escalation_hours: e.target.value })} />
          </CrmField>
          <div className="md:col-span-2">
            <CrmField label="Checklist (one item per line)">
              <CrmTextarea rows={4} value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} placeholder="Verify passport&#10;Confirm bank statement" />
            </CrmField>
          </div>
          <div>
            <CrmButton type="submit" variant="solid" size="sm">Save playbook</CrmButton>
          </div>
        </form>
      </CrmTableCard>

      <CrmTableCard>
        <CrmCardHeader label="Library" title="Configured playbooks" />
        {loading ? (
          <div className="p-4 text-sm text-ink-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <CrmEmptyState title="No playbooks yet" />
        ) : (
          <DataTable columns={cols} data={rows} empty={{ title: "No playbooks" }} />
        )}
      </CrmTableCard>
    </div>
  );
}
