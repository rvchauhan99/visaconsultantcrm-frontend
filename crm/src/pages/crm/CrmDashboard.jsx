import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { CrmStatCard, CrmTableCard, CrmCardHeader, CrmEmptyState } from "@/components/ui/crm-card";
import { PageHeader } from "@/components/ui/page-header";
import { Briefcase, AlertTriangle, Clock, CheckCircle2, TrendingUp } from "lucide-react";

const STAGE_ORDER = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
const STAGE_LABELS = {
  new: "New", docs_pending: "Docs pending", ready_to_submit: "Ready",
  submitted: "Submitted", decision: "Decision", closed: "Closed",
};

const slaColor = {
  on_track: "success", due_soon: "warning", overdue: "danger", completed: "muted",
};

export default function CrmDashboard() {
  const [pipeline, setPipeline] = useState(null);
  const [sla, setSla] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [recent, setRecent] = useState([]);
  const [workload, setWorkload] = useState(null);

  useEffect(() => {
    api.get("/crm/reports/pipeline").then((r) => setPipeline(r.data));
    api.get("/crm/reports/sla").then((r) => setSla(r.data));
    api.get("/crm/reports/funnel").then((r) => setFunnel(r.data));
    api.get("/crm/cases").then((r) => setRecent(r.data.slice(0, 8)));
    api.get("/crm/workload").then((r) => setWorkload(r.data));
  }, []);

  /* Stage bar calculations */
  const stageTotal = pipeline
    ? Object.values(pipeline.by_stage).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="p-6 max-w-full space-y-6">
      <PageHeader
        label="Overview"
        title="Dashboard"
        subtitle="Real-time pipeline and SLA overview"
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="dashboard-metrics">
        <CrmStatCard
          label="Open cases"
          value={pipeline?.total_open ?? "—"}
          icon={Briefcase}
          trend={pipeline?.total_open > 0 ? "up" : "flat"}
        />
        <CrmStatCard
          label="Overdue"
          value={sla?.overdue ?? "—"}
          icon={AlertTriangle}
          tone={sla?.overdue > 0 ? "danger" : "default"}
          trend={sla?.overdue > 0 ? "down" : "flat"}
        />
        <CrmStatCard
          label="Due soon"
          value={sla?.due_soon ?? "—"}
          icon={Clock}
          tone={sla?.due_soon > 0 ? "warning" : "default"}
        />
        <CrmStatCard
          label="Completed"
          value={funnel?.closed ?? "—"}
          icon={CheckCircle2}
          trend="up"
          delta="this month"
        />
      </div>

      {/* ── Stage bar + Recent ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Stage breakdown */}
        <CrmTableCard>
          <CrmCardHeader label="Pipeline" title="By stage" />
          <div className="p-4 space-y-3">
            {pipeline && stageTotal > 0 ? (
              STAGE_ORDER.filter((s) => pipeline.by_stage[s] !== undefined).map((stage) => {
                const count = pipeline.by_stage[stage] ?? 0;
                const pct = stageTotal ? Math.round((count / stageTotal) * 100) : 0;
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink capitalize">{STAGE_LABELS[stage]}</span>
                      <span className="font-mono text-ink-muted">{count} <span className="text-ink-muted/50">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-navy to-teal transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <CrmEmptyState title="No open cases yet" />
            )}
          </div>
        </CrmTableCard>

        {/* Recent cases */}
        <CrmTableCard>
          <CrmCardHeader label="Cases" title="Recent cases" />
          <ul className="divide-y divide-border">
            {recent.length === 0 ? (
              <li><CrmEmptyState title="No cases yet" /></li>
            ) : (
              recent.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/cases/${c.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors"
                    data-testid={`recent-case-${c.id.slice(0, 6)}`}
                  >
                    <span className="text-lg shrink-0">{c.config_snapshot_json.country_flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate">
                        {c.config_snapshot_json.country_name}
                      </div>
                      <div className="text-[10px] text-ink-muted truncate">{c.customer?.full_name}</div>
                    </div>
                    <Stamp tone={slaColor[c.sla_status] ?? "muted"} size="sm">{c.stage}</Stamp>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CrmTableCard>
      </div>

      {/* ── My Workload ── */}
      <CrmTableCard data-testid="workload-panel">
        <CrmCardHeader
          label="Workload"
          title="My assigned cases"
          actions={workload && (
            <div className="flex items-center gap-2">
              <Stamp tone="ink" size="sm">{workload.open} open</Stamp>
              <Stamp tone={workload.due_soon > 0 ? "warning" : "muted"} size="sm">
                {workload.due_soon} due soon
              </Stamp>
              <Stamp tone={workload.overdue > 0 ? "danger" : "muted"} size="sm">
                {workload.overdue} overdue
              </Stamp>
            </div>
          )}
        />
        {!workload ? (
          <div className="p-4">
            {[0,1,2,3].map((i) => (
              <div key={i} className="h-8 rounded bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite] mb-2" />
            ))}
          </div>
        ) : workload.cases.length === 0 ? (
          <CrmEmptyState title="No open cases assigned" description="You're all caught up." />
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Case</th>
                <th>Country</th>
                <th>Customer</th>
                <th>SLA status</th>
                <th>Due date</th>
              </tr>
            </thead>
            <tbody>
              {workload.cases.slice(0, 10).map((c) => (
                <tr key={c.id} className="clickable">
                  <td>
                    <Link to={`/cases/${c.id}`} className="font-mono text-navy hover:underline" data-testid={`workload-case-${c.id.slice(0, 6)}`}>
                      #{c.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="flex items-center gap-1.5">
                    <span>{c.country_flag}</span>
                    <span>{c.country}</span>
                  </td>
                  <td className="text-ink-muted">{c.customer_name || "—"}</td>
                  <td>
                    <Stamp tone={slaColor[c.sla_status] ?? "muted"} size="sm">
                      {c.sla_status?.replace("_", " ") || "—"}
                    </Stamp>
                  </td>
                  <td className="font-mono text-ink-muted">
                    {c.sla_due_date ? new Date(c.sla_due_date).toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CrmTableCard>
    </div>
  );
}
