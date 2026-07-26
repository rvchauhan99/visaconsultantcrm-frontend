import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Download, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmStatCard, CrmTableCard, CrmCardHeader, CrmEmptyState } from "@/components/ui/crm-card";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { FilterPanel } from "@/components/ui/filter-panel";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState } from "@/hooks/useListQueryState";
import Stamp from "@/components/Stamp";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STAGE_ORDER = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
const STAGE_LABELS = { new: "New", docs_pending: "Docs pending", ready_to_submit: "Ready", submitted: "Submitted", decision: "Decision", closed: "Closed" };

const FILTER_KEYS = ["from_date", "to_date", "country", "source", "consultant_id"];
const LIST_DEFAULTS = {};

function dictToRows(obj, keyName = "key") {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return Object.entries(obj).map(([k, v]) => (
    typeof v === "object" && v !== null
      ? { [keyName]: k, ...v }
      : { [keyName]: k, count: v }
  ));
}

export default function Reports() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [pipeline, setPipeline] = useState(null);
  const [sla, setSla] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [reject, setReject] = useState([]);
  const [exporting, setExporting] = useState(false);

  const scopeParams = useMemo(() => ({ ...list.filters }), [list.filters]);

  const load = useCallback(() => {
    const params = scopeParams;
    api.get("/crm/reports/pipeline", { params }).then((r) => setPipeline(r.data)).catch(() => setPipeline(null));
    api.get("/crm/reports/sla", { params }).then((r) => setSla(r.data)).catch(() => setSla(null));
    api.get("/crm/reports/funnel", { params }).then((r) => setFunnel(r.data)).catch(() => setFunnel(null));
    api.get("/crm/reports/revenue", { params }).then((r) => setRevenue(r.data)).catch(() => setRevenue(null));
    api.get("/crm/reports/doc-rejection-rate", { params }).then((r) => setReject(r.data || [])).catch(() => setReject([]));
  }, [scopeParams]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api.get("/crm/reports/export.csv", { params: scopeParams, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url; a.download = "passage-cases.csv";
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error("Export failed"); } finally { setExporting(false); }
  };

  const filterFields = useMemo(() => [
    { key: "range", label: "Date range", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    {
      key: "country",
      label: "Country",
      type: "async",
      render: (value, onChange) => (
        <CountrySelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All countries" />
      ),
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
      ],
    },
    {
      key: "consultant_id",
      label: "Consultant",
      type: "async",
      render: (value, onChange) => (
        <ConsultantSelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All consultants" />
      ),
    },
  ], []);

  const stageTotal = pipeline?.by_stage
    ? Object.values(pipeline.by_stage).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0)
    : 0;

  const pipelineCountryRows = dictToRows(pipeline?.by_country, "country_code");
  const pipelineConsultantRows = dictToRows(pipeline?.by_consultant, "consultant_id");

  const revenueByCountryCols = [
    { key: "country_code", label: "Country" },
    {
      key: "revenue",
      label: "Total revenue",
      render: (row) => <span className="font-mono">{INR.format(row.revenue ?? row.total ?? 0)}</span>,
    },
    { key: "cases", label: "Cases", render: (row) => <span className="font-mono">{row.cases ?? "—"}</span> },
  ];

  const revenueByConsultantCols = [
    {
      key: "consultant",
      label: "Consultant",
      render: (row) => row.consultant_name || row.full_name || row.consultant_id || row.key || "—",
    },
    {
      key: "revenue",
      label: "Revenue",
      render: (row) => <span className="font-mono">{INR.format(row.revenue ?? row.total ?? 0)}</span>,
    },
    { key: "cases", label: "Cases", render: (row) => <span className="font-mono">{row.cases ?? "—"}</span> },
  ];

  const pipelineCountryCols = [
    { key: "country_code", label: "Country" },
    { key: "count", label: "Open cases", render: (row) => <span className="font-mono">{row.count ?? row.cases ?? "—"}</span> },
  ];

  const pipelineConsultantCols = [
    {
      key: "consultant_id",
      label: "Consultant",
      render: (row) => row.consultant_name || row.full_name || (row.consultant_id === "unassigned" ? "Unassigned" : row.consultant_id) || "—",
    },
    { key: "count", label: "Open cases", render: (row) => <span className="font-mono">{row.count ?? row.cases ?? "—"}</span> },
  ];

  const rejectCols = [
    { key: "doc_key", label: "Document" },
    { key: "total", label: "Total submitted", render: (row) => <span className="font-mono">{row.total}</span> },
    { key: "rejected", label: "Rejected", render: (row) => <span className="font-mono text-danger">{row.rejected}</span> },
    { key: "rate", label: "Rejection rate", render: (row) => {
      const pct = row.rejection_rate ?? (row.total ? Math.round((row.rejected / row.total) * 100) : 0);
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full rounded-full bg-danger/70" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-xs text-ink-muted">{pct}%</span>
        </div>
      );
    }},
  ];

  const paidCount = funnel?.paid ?? funnel?.applications_paid;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        label="Analytics"
        title="Reports"
        actions={
          <CrmButton
            variant="solid"
            size="sm"
            onClick={exportCsv}
            loading={exporting}
            data-testid="reports-export"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </CrmButton>
        }
      />

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        activeCount={list.activeFilterCount}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        defaultOpen
        testId="reports-filters"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="reports-metrics">
        <Link to="/pipeline" className="block hover:opacity-90 transition-opacity">
          <CrmStatCard label="Open cases" value={pipeline?.total_open ?? "—"} icon={BarChart3} />
        </Link>
        <Link to="/pipeline?sla=overdue" className="block hover:opacity-90 transition-opacity">
          <CrmStatCard label="Overdue" value={sla?.overdue ?? "—"} tone={sla?.overdue > 0 ? "danger" : "default"} />
        </Link>
        <Link to="/pipeline?sla=due_soon" className="block hover:opacity-90 transition-opacity">
          <CrmStatCard label="Due soon" value={sla?.due_soon ?? "—"} tone={sla?.due_soon > 0 ? "warning" : "default"} />
        </Link>
        <CrmStatCard label="Total revenue" value={revenue?.total != null ? INR.format(revenue.total) : "—"} />
      </div>

      <CrmTableCard>
        <CrmCardHeader label="Pipeline" title="Cases by stage" />
        <div className="p-4 space-y-3">
          {pipeline?.by_stage && stageTotal > 0 ? (
            STAGE_ORDER.filter((s) => pipeline.by_stage[s] !== undefined).map((stage) => {
              const count = pipeline.by_stage[stage] ?? 0;
              const pct = stageTotal ? Math.round((count / stageTotal) * 100) : 0;
              return (
                <Link key={stage} to={`/pipeline?stage=${stage}`} className="block hover:opacity-90">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink">{STAGE_LABELS[stage]}</span>
                    <span className="font-mono text-ink-muted">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-navy to-teal transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })
          ) : <CrmEmptyState title="No pipeline data yet" />}
        </div>
      </CrmTableCard>

      {funnel && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="reports-funnel">
          <CrmStatCard label="New applications" value={funnel.new_applications ?? funnel.cases ?? "—"} />
          <Link to="/pipeline?stage=submitted" className="block hover:opacity-90">
            <CrmStatCard label="Submitted" value={funnel.submitted ?? "—"} />
          </Link>
          <CrmStatCard label="Paid" value={paidCount ?? "—"} />
          <CrmStatCard label="Approved" value={funnel.approved ?? "—"} trend="up" />
          <Link to="/pipeline?stage=closed" className="block hover:opacity-90">
            <CrmStatCard label="Closed" value={funnel.closed ?? "—"} trend="up" />
          </Link>
        </div>
      )}

      {pipelineCountryRows.length > 0 && (
        <CrmTableCard>
          <CrmCardHeader label="Pipeline" title="By country" />
          <DataTable columns={pipelineCountryCols} data={pipelineCountryRows} empty={{ title: "No country data" }} />
        </CrmTableCard>
      )}
      {pipelineConsultantRows.length > 0 && (
        <CrmTableCard>
          <CrmCardHeader label="Pipeline" title="By consultant" />
          <DataTable columns={pipelineConsultantCols} data={pipelineConsultantRows} empty={{ title: "No consultant data" }} />
        </CrmTableCard>
      )}

      {revenue?.by_country && revenue.by_country.length > 0 && (
        <CrmTableCard>
          <CrmCardHeader label="Revenue" title="By country" />
          <DataTable columns={revenueByCountryCols} data={revenue.by_country} empty={{ title: "No revenue data" }} />
        </CrmTableCard>
      )}

      {revenue?.by_consultant && revenue.by_consultant.length > 0 && (
        <CrmTableCard>
          <CrmCardHeader label="Revenue" title="By consultant" />
          <DataTable columns={revenueByConsultantCols} data={revenue.by_consultant} empty={{ title: "No consultant revenue" }} />
        </CrmTableCard>
      )}

      {reject.length > 0 && (
        <CrmTableCard>
          <CrmCardHeader label="Quality" title="Document rejection rates" />
          <DataTable columns={rejectCols} data={reject} empty={{ title: "No rejection data" }} />
        </CrmTableCard>
      )}

      {sla && (
        <CrmTableCard>
          <CrmCardHeader label="SLA" title="SLA health" />
          <div className="p-4 grid grid-cols-3 gap-4">
            {[
              { label: "On track", value: sla.on_track ?? 0, tone: "success", to: "/pipeline?sla=on_track" },
              { label: "Due soon", value: sla.due_soon ?? 0, tone: "warning", to: "/pipeline?sla=due_soon" },
              { label: "Overdue", value: sla.overdue ?? 0, tone: "danger", to: "/pipeline?sla=overdue" },
            ].map((item) => (
              <Link key={item.label} to={item.to} className="text-center hover:opacity-90">
                <div className={`font-mono text-2xl font-semibold mb-1 ${item.tone === "success" ? "text-success" : item.tone === "warning" ? "text-warning" : "text-danger"}`}>
                  {item.value}
                </div>
                <Stamp tone={item.tone} size="sm">{item.label}</Stamp>
              </Link>
            ))}
          </div>
        </CrmTableCard>
      )}
    </div>
  );
}
