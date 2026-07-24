import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Download, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmStatCard, CrmTableCard, CrmCardHeader, CrmEmptyState } from "@/components/ui/crm-card";
import { DataTable } from "@/components/ui/data-table";
import Stamp from "@/components/Stamp";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STAGE_ORDER = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
const STAGE_LABELS = { new: "New", docs_pending: "Docs pending", ready_to_submit: "Ready", submitted: "Submitted", decision: "Decision", closed: "Closed" };

export default function Reports() {
  const [pipeline, setPipeline] = useState(null);
  const [sla, setSla] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [reject, setReject] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get("/crm/reports/pipeline").then((r) => setPipeline(r.data));
    api.get("/crm/reports/sla").then((r) => setSla(r.data));
    api.get("/crm/reports/funnel").then((r) => setFunnel(r.data));
    api.get("/crm/reports/revenue").then((r) => setRevenue(r.data));
    api.get("/crm/reports/doc-rejection-rate").then((r) => setReject(r.data));
    api.get("/crm/consultants").then((r) => setConsultants(r.data));
  }, []);

  const consultantName = (id) => {
    if (id === "unassigned") return "Unassigned";
    return consultants.find((c) => c.id === id)?.full_name || id;
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api.get("/crm/reports/export.csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url; a.download = "passage-cases.csv";
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error("Export failed"); } finally { setExporting(false); }
  };

  /* Stage bar */
  const stageTotal = pipeline ? Object.values(pipeline.by_stage).reduce((a, b) => a + b, 0) : 0;

  /* Revenue by consultant columns */
  const revByConsultantCols = [
    { key: "consultant_id", label: "Consultant", render: (row) => consultantName(row.consultant_id) },
    { key: "total", label: "Total revenue", render: (row) => <span className="font-mono">{INR.format(row.total)}</span> },
    { key: "cases", label: "Cases", render: (row) => <span className="font-mono">{row.cases}</span> },
  ];

  const rejectCols = [
    { key: "doc_key", label: "Document" },
    { key: "total", label: "Total submitted", render: (row) => <span className="font-mono">{row.total}</span> },
    { key: "rejected", label: "Rejected", render: (row) => <span className="font-mono text-danger">{row.rejected}</span> },
    { key: "rate", label: "Rejection rate", render: (row) => {
      const pct = row.total ? Math.round((row.rejected / row.total) * 100) : 0;
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="reports-metrics">
        <CrmStatCard label="Open cases" value={pipeline?.total_open ?? "—"} icon={BarChart3} />
        <CrmStatCard label="Overdue" value={sla?.overdue ?? "—"} tone={sla?.overdue > 0 ? "danger" : "default"} />
        <CrmStatCard label="Due soon" value={sla?.due_soon ?? "—"} tone={sla?.due_soon > 0 ? "warning" : "default"} />
        <CrmStatCard label="Total revenue" value={revenue?.total ? INR.format(revenue.total) : "—"} />
      </div>

      {/* Stage breakdown */}
      <CrmTableCard>
        <CrmCardHeader label="Pipeline" title="Cases by stage" />
        <div className="p-4 space-y-3">
          {pipeline && stageTotal > 0 ? (
            STAGE_ORDER.filter((s) => pipeline.by_stage[s] !== undefined).map((stage) => {
              const count = pipeline.by_stage[stage] ?? 0;
              const pct = stageTotal ? Math.round((count / stageTotal) * 100) : 0;
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink">{STAGE_LABELS[stage]}</span>
                    <span className="font-mono text-ink-muted">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-navy to-teal transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          ) : <CrmEmptyState title="No pipeline data yet" />}
        </div>
      </CrmTableCard>

      {/* Funnel */}
      {funnel && (
        <div className="grid md:grid-cols-3 gap-3" data-testid="reports-funnel">
          <CrmStatCard label="New applications" value={funnel.new_applications ?? "—"} />
          <CrmStatCard label="Submitted" value={funnel.submitted ?? "—"} />
          <CrmStatCard label="Closed (approved)" value={funnel.closed ?? "—"} trend="up" />
        </div>
      )}

      {/* Revenue by consultant */}
      {revenue?.by_consultant && revenue.by_consultant.length > 0 && (
        <CrmTableCard>
          <CrmCardHeader label="Revenue" title="By consultant" />
          <DataTable
            columns={revByConsultantCols}
            data={revenue.by_consultant}
            empty={{ title: "No revenue data" }}
          />
        </CrmTableCard>
      )}

      {/* Doc rejection rates */}
      {reject.length > 0 && (
        <CrmTableCard>
          <CrmCardHeader label="Quality" title="Document rejection rates" />
          <DataTable
            columns={rejectCols}
            data={reject}
            empty={{ title: "No rejection data" }}
          />
        </CrmTableCard>
      )}

      {/* SLA table */}
      {sla && (
        <CrmTableCard>
          <CrmCardHeader label="SLA" title="SLA health" />
          <div className="p-4 grid grid-cols-3 gap-4">
            {[
              { label: "On track", value: sla.on_track ?? 0, tone: "success" },
              { label: "Due soon", value: sla.due_soon ?? 0, tone: "warning" },
              { label: "Overdue", value: sla.overdue ?? 0, tone: "danger" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={`font-mono text-2xl font-semibold mb-1 ${item.tone === "success" ? "text-success" : item.tone === "warning" ? "text-warning" : "text-danger"}`}>
                  {item.value}
                </div>
                <Stamp tone={item.tone} size="sm">{item.label}</Stamp>
              </div>
            ))}
          </div>
        </CrmTableCard>
      )}
    </div>
  );
}
