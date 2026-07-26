import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmStatCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { formatCaseNumber } from "@/lib/utils";
import { CheckCircle2, Download, RefreshCw, Timer } from "lucide-react";

const FILTER_KEYS = [
  "country", "consultant_id", "decision", "visa_type", "payment_status",
  "closed_from", "closed_to",
];
const LIST_DEFAULTS = { limit: "25", sort_by: "updated_at", sort_order: "desc" };

const DECISION_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function ClosedCases() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/crm/cases", {
      params: { ...list.apiParams, stage_group: "closed", include_summary: true },
    })
      .then((r) => {
        const { items, meta: m, summary: s } = unwrapListResponse(r.data);
        setRows(items);
        setMeta(m);
        setSummary(s);
      })
      .catch(() => toast.error("Failed to load closed cases"))
      .finally(() => setLoading(false));
  }, [list.apiParams]);

  useEffect(() => { load(); }, [load]);

  const byDecision = summary?.by_decision || {};
  const approved = byDecision.approved || 0;
  const rejected = byDecision.rejected || 0;
  const decided = approved + rejected;
  const approvalRate = decided ? Math.round((approved / decided) * 100) : 0;

  const filterFields = useMemo(() => [
    {
      key: "country",
      label: "Country",
      type: "async",
      render: (value, onChange) => (
        <CountrySelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All countries" />
      ),
    },
    {
      key: "consultant_id",
      label: "Consultant",
      type: "async",
      render: (value, onChange) => (
        <ConsultantSelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All consultants" />
      ),
    },
    { key: "decision", label: "Decision", type: "select", options: DECISION_OPTIONS },
    { key: "visa_type", label: "Visa type", type: "text", placeholder: "e.g. tourist" },
    {
      key: "payment_status",
      label: "Payment",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "paid", label: "Paid" },
      ],
    },
    { key: "closed", label: "Closed date", type: "daterange", fromKey: "closed_from", toKey: "closed_to" },
  ], []);

  const columns = [
    {
      key: "case_number",
      label: "Case",
      render: (c) => (
        <Link to={`/cases/${c.id}`} className="font-mono text-navy hover:underline text-xs">
          {formatCaseNumber(c)}
        </Link>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: false,
      render: (c) => <span className="text-xs">{c.customer?.full_name || "—"}</span>,
    },
    {
      key: "country",
      label: "Country",
      sortable: false,
      render: (c) => (
        <span className="inline-flex items-center gap-1">
          <span>{c.config_snapshot_json?.country_flag}</span>
          <span>{c.config_snapshot_json?.country_code}</span>
        </span>
      ),
    },
    {
      key: "visa_type",
      label: "Visa",
      sortable: false,
      render: (c) => <span className="capitalize text-xs">{c.config_snapshot_json?.visa_type || "—"}</span>,
    },
    {
      key: "decision_outcome",
      label: "Decision",
      render: (c) => {
        const d = c.decision_outcome || "—";
        const tone = d === "approved" ? "success" : d === "rejected" ? "danger" : "muted";
        return <Stamp tone={tone} size="sm">{d}</Stamp>;
      },
    },
    {
      key: "payment_status",
      label: "Payment",
      render: (c) => <Stamp tone={c.payment_status === "paid" ? "success" : "warning"} size="sm">{c.payment_status || "—"}</Stamp>,
    },
    {
      key: "assigned_consultant",
      label: "Consultant",
      sortable: false,
      render: (c) => <span className="text-xs">{c.assigned_consultant?.full_name || "—"}</span>,
    },
    {
      key: "updated_at",
      label: "Closed",
      render: (c) => (
        <span className="font-mono text-[11px] text-ink-muted">
          {c.updated_at ? new Date(c.updated_at).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
  ];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = { ...list.apiParams, stage_group: "closed" };
      delete params.page;
      delete params.limit;
      const r = await api.get("/crm/reports/export.csv", { params, responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "closed-cases.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        label="Cases"
        title="Closed cases"
        subtitle="Archive of decided applications"
        actions={
          <>
            <CrmButton variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </CrmButton>
            <CrmButton variant="outline" size="sm" loading={exporting} onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </CrmButton>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CrmStatCard label="Closed total" value={meta.total ?? "—"} icon={CheckCircle2} />
        <CrmStatCard label="Approved" value={approved} tone="success" />
        <CrmStatCard label="Rejected" value={rejected} tone={rejected ? "danger" : "default"} />
        <CrmStatCard label="Approval rate" value={`${approvalRate}%`} icon={Timer} delta="of decided" />
      </div>

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search closed cases…"
        testId="closed-filters"
      />

      <PaginatedTable
        columns={columns}
        data={rows}
        loading={loading}
        empty={{ title: "No closed cases match filters" }}
        page={list.page}
        limit={list.limit}
        total={meta.total || 0}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        sortKey={list.sortBy}
        sortDir={list.sortOrder}
        onSortChange={list.setSort}
        serverSort
        testId="closed-table"
      />
    </div>
  );
}
