import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { StampIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmStatCard, CrmTableCard, CrmEmptyState } from "@/components/ui/crm-card";
import { CrmSelect } from "@/components/ui/crm-field";
import { DataTable } from "@/components/ui/data-table";

const urgencyTone = (u) =>
  u === "expired" || u === "critical" ? "danger" : u === "urgent" ? "warning" : "teal";

export default function PassportExpiry() {
  const [rows, setRows] = useState([]);
  const [window_, setWindow] = useState(180);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/crm/passport-expiry?days=${window_}`)
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, [window_]);

  const buckets = {
    expired:  rows.filter((r) => r.urgency === "expired"),
    critical: rows.filter((r) => r.urgency === "critical"),
    urgent:   rows.filter((r) => r.urgency === "urgent"),
    monitor:  rows.filter((r) => r.urgency === "monitor"),
  };

  const columns = [
    { key: "customer_name", label: "Customer" },
    { key: "passport_number", label: "Passport", render: (row) => <span className="font-mono text-xs">{row.passport_number || "—"}</span> },
    { key: "passport_expiry_date", label: "Expiry", render: (row) => <span className="font-mono text-xs">{row.passport_expiry_date}</span> },
    {
      key: "days_left",
      label: "Days left",
      render: (row) => <Stamp tone={urgencyTone(row.urgency)} size="sm">{row.days_left}d</Stamp>,
    },
    {
      key: "sources",
      label: "Sources",
      sortable: false,
      render: (row) => (
        <span className="text-xs flex flex-wrap gap-1">
          {row.sources.map((s, j) => (
            <span key={j}>
              {s.type === "case"
                ? <Link to={`/cases/${s.case_id}`} className="text-teal hover:underline">{s.country}</Link>
                : <span className="text-ink-muted">Profile · {s.relationship}</span>}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "customer_email",
      label: "Contact",
      sortable: false,
      render: (row) => (
        <span className="font-mono text-xs text-ink-muted">
          {row.customer_email}<br />{row.customer_phone}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        label="Renewal watch"
        title="Passport expiry"
        actions={
          <CrmSelect
            value={window_}
            onChange={(e) => setWindow(Number(e.target.value))}
            className="w-44"
            data-testid="expiry-window"
          >
            <option value={30}>Next 30 days</option>
            <option value={90}>Next 90 days</option>
            <option value={180}>Next 180 days</option>
            <option value={365}>Next 365 days</option>
            <option value={3650}>All expiries on file</option>
          </CrmSelect>
        }
      />

      {/* Bucket stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CrmStatCard label="Expired" value={buckets.expired.length} tone={buckets.expired.length > 0 ? "danger" : "default"} />
        <CrmStatCard label="≤ 30 days" value={buckets.critical.length} tone={buckets.critical.length > 0 ? "danger" : "default"} />
        <CrmStatCard label="≤ 90 days" value={buckets.urgent.length} tone={buckets.urgent.length > 0 ? "warning" : "default"} />
        <CrmStatCard label="Monitor" value={buckets.monitor.length} />
      </div>

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          rowTestId={(_, i) => `expiry-row-${i}`}
          empty={{
            icon: StampIcon,
            title: "No passports expiring in this window",
            description: "All clear! 🎉",
          }}
        />
      </CrmTableCard>
    </div>
  );
}
