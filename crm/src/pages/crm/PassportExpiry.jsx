import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { StampIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmStatCard, CrmTableCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState } from "@/hooks/useListQueryState";

const FILTER_KEYS = ["days"];
const LIST_DEFAULTS = {};
const DAY_OPTIONS = [
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 90 days" },
  { value: "180", label: "Next 180 days" },
  { value: "365", label: "Next 365 days" },
  { value: "3650", label: "All expiries on file" },
];

const urgencyTone = (u) =>
  u === "expired" || u === "critical" ? "danger" : u === "urgent" ? "warning" : "teal";

export default function PassportExpiry() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const days = [30, 90, 180, 365, 3650].includes(Number(list.filters.days))
    ? String(list.filters.days)
    : "180";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/crm/passport-expiry", { params: { days } })
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, [days]);

  const filterFields = useMemo(() => [
    {
      key: "days",
      label: "Window",
      type: "select",
      options: DAY_OPTIONS,
    },
  ], []);

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
    <div className="p-4 space-y-4">
      <PageHeader
        label="Renewal watch"
        title="Passport expiry"
      />

      <FilterPanel
        fields={filterFields}
        values={{ ...list.filters, days }}
        activeCount={list.filters.days ? 1 : 0}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        defaultOpen
        testId="expiry-filters"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
          density="compact"
          stickyHeader
          rowTestId={(_, i) => `expiry-row-${i}`}
          empty={{
            icon: StampIcon,
            title: "No passports expiring in this window",
            description: "All clear for this window.",
          }}
        />
      </CrmTableCard>
    </div>
  );
}
