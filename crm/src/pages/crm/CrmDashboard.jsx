import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "@/lib/api";
import { formatCaseNumber } from "@/lib/utils";
import Stamp from "@/components/Stamp";
import { ConsultantSelect } from "@/components/forms/selects";
import { CrmStatCard, CrmTableCard, CrmCardHeader, CrmEmptyState, CrmCard, CrmSkeleton } from "@/components/ui/crm-card";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { FilterPanel } from "@/components/ui/filter-panel";
import { MeterBar } from "@/components/ui/meter-bar";
import { useListQueryState } from "@/hooks/useListQueryState";
import {
  Briefcase, AlertTriangle, Clock, CheckCircle2, ListChecks,
  UserX, FileCheck, CreditCard, PauseCircle, StampIcon, RefreshCw, Wallet, PhoneCall, UserPlus,
} from "lucide-react";

const FILTER_KEYS = ["from_date", "to_date", "consultant_id"];
const LIST_DEFAULTS = {};

const STAGE_ORDER = ["new", "docs_pending", "ready_to_submit", "submitted", "decision"];
const STAGE_LABELS = {
  new: "New", docs_pending: "Docs pending", ready_to_submit: "Ready",
  submitted: "Submitted", decision: "Decision", closed: "Closed",
};

const slaColor = {
  on_track: "success", due_soon: "warning", overdue: "danger", completed: "muted",
};

function queueCount(q, key) {
  if (!q) return 0;
  const v = q[key];
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object") return v.count ?? v.total ?? (Array.isArray(v.items) ? v.items.length : 0);
  return 0;
}

function inr(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

const QUEUE_CARDS = [
  { key: "leads_due_today", label: "Leads due today", to: "/follow-ups?due=today", icon: PhoneCall, tone: "warning", scopeKeys: [] },
  { key: "leads_overdue", label: "Leads overdue", to: "/follow-ups?due=overdue", icon: UserPlus, tone: "danger", scopeKeys: [] },
  { key: "tasks_overdue", label: "Tasks overdue", to: "/tasks?status=open&due=overdue", icon: ListChecks, tone: "danger", scopeKeys: ["from_date", "to_date"] },
  { key: "tasks_due_today", label: "Tasks due today", to: "/tasks?status=open&due=today", icon: Clock, tone: "warning", scopeKeys: ["from_date", "to_date"] },
  { key: "unassigned_cases", label: "Unassigned cases", to: "/pipeline?unassigned=true", icon: UserX, tone: "default", scopeKeys: ["from_date", "to_date", "consultant_id"] },
  { key: "docs_pending_review", label: "Docs to review", to: "/pipeline?stage=docs_pending", icon: FileCheck, tone: "default", scopeKeys: ["from_date", "to_date", "consultant_id"] },
  { key: "pending_payments", label: "Pending payments", to: "/pipeline?payment_status=pending", icon: CreditCard, tone: "warning", scopeKeys: ["from_date", "to_date", "consultant_id"] },
  { key: "on_hold", label: "On hold / RFI", to: "/pipeline?on_hold=true", icon: PauseCircle, tone: "warning", scopeKeys: ["from_date", "to_date", "consultant_id"] },
  { key: "overdue_sla", label: "SLA overdue", to: "/pipeline?sla=overdue", icon: AlertTriangle, tone: "danger", scopeKeys: ["from_date", "to_date", "consultant_id"] },
  { key: "passport_expiry_30d", label: "Passport expiry (30d)", to: "/passport-expiry?days=30", icon: StampIcon, tone: "default", scopeKeys: [] },
];

function pickScope(scope, keys) {
  if (!scope || !keys || keys.length === 0) return {};
  const out = {};
  keys.forEach((k) => {
    if (scope[k] != null && scope[k] !== "") out[k] = scope[k];
  });
  return out;
}

function appendScope(path, scope) {
  if (!scope || Object.keys(scope).length === 0) return path;
  const [base, qs = ""] = path.split("?");
  const params = new URLSearchParams(qs);
  Object.entries(scope).forEach(([k, v]) => {
    if (v != null && v !== "") params.set(k, v);
  });
  const out = params.toString();
  return out ? `${base}?${out}` : base;
}

function WidgetError({ message, onRetry }) {
  return (
    <div className="p-4 text-center">
      <p className="text-xs text-danger mb-2">{message || "Failed to load"}</p>
      {onRetry && (
        <CrmButton variant="outline" size="xs" onClick={onRetry}>Retry</CrmButton>
      )}
    </div>
  );
}

export default function CrmDashboard() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [pipeline, setPipeline] = useState(null);
  const [sla, setSla] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [recent, setRecent] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [queues, setQueues] = useState(null);
  const [collections, setCollections] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState({});

  const reportParams = useMemo(() => ({ ...list.filters }), [list.filters]);
  const scopeQuery = reportParams;

  const filterFields = useMemo(() => [
    { key: "range", label: "Date range", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    {
      key: "consultant_id",
      label: "Consultant",
      type: "async",
      render: (value, onChange) => (
        <ConsultantSelect
          value={value || null}
          onChange={(v) => onChange(v || "")}
          placeholder="All consultants"
        />
      ),
    },
  ], []);

  const load = useCallback(() => {
    let cancelled = false;
    const track = (key, promise, setter) => {
      setLoading((l) => ({ ...l, [key]: true }));
      setErrors((e) => ({ ...e, [key]: null }));
      promise
        .then((r) => { if (!cancelled) setter(r.data); })
        .catch(() => { if (!cancelled) setErrors((e) => ({ ...e, [key]: true })); })
        .finally(() => { if (!cancelled) setLoading((l) => ({ ...l, [key]: false })); });
    };

    track("pipeline", api.get("/crm/reports/pipeline", { params: reportParams }), setPipeline);
    track("sla", api.get("/crm/reports/sla", { params: reportParams }), setSla);
    track("funnel", api.get("/crm/reports/funnel", { params: reportParams }), setFunnel);
    track("recent", api.get("/crm/cases", {
      params: { ...reportParams, stage_group: "active", page: 1, limit: 8, include_summary: false },
    }), (data) => setRecent(Array.isArray(data) ? data.slice(0, 8) : (data?.items || []).slice(0, 8)));
    track("workload", api.get("/crm/workload"), setWorkload);
    track("queues", api.get("/crm/ops/queues"), setQueues);
    track("collections", api.get("/crm/reports/payments", { params: reportParams }), setCollections);

    return () => { cancelled = true; };
  }, [reportParams]);

  useEffect(() => {
    const cancel = load();
    return cancel;
  }, [load]);

  const stageTotal = pipeline?.by_stage
    ? STAGE_ORDER.reduce((a, s) => a + (pipeline.by_stage[s] || 0), 0)
    : 0;

  const trendData = useMemo(() => {
    const periods = collections?.by_period || [];
    return periods.map((p) => ({ date: p.date, collected: p.amount }));
  }, [collections]);

  return (
    <div className="p-4 max-w-full space-y-4">
      <PageHeader
        label="Overview"
        title="Dashboard"
        subtitle="Pipeline, SLA and collections at a glance"
        actions={
          <CrmButton variant="outline" size="sm" onClick={load} data-testid="dashboard-refresh">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
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
        testId="dashboard-filters"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="dashboard-metrics">
        <Link to={appendScope("/pipeline", scopeQuery)} className="block hover:opacity-90">
          {loading.pipeline && !pipeline ? <CrmSkeleton className="h-[88px]" /> : (
            <CrmStatCard label="Open cases" value={pipeline?.total_open ?? (errors.pipeline ? "!" : "—")} icon={Briefcase} />
          )}
        </Link>
        <Link to={appendScope("/pipeline?sla=overdue", scopeQuery)} className="block hover:opacity-90">
          <CrmStatCard
            label="Overdue"
            value={sla?.overdue ?? (errors.sla ? "!" : "—")}
            icon={AlertTriangle}
            tone={sla?.overdue > 0 ? "danger" : "default"}
          />
        </Link>
        <Link to={appendScope("/pipeline?sla=due_soon", scopeQuery)} className="block hover:opacity-90">
          <CrmStatCard
            label="Due soon"
            value={sla?.due_soon ?? "—"}
            icon={Clock}
            tone={sla?.due_soon > 0 ? "warning" : "default"}
          />
        </Link>
        <Link to={appendScope("/cases/closed", scopeQuery)} className="block hover:opacity-90">
          <CrmStatCard label="Completed" value={funnel?.closed ?? "—"} icon={CheckCircle2} delta="closed cases" />
        </Link>
      </div>

      {/* Collections snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Link to={appendScope("/reports/payments", scopeQuery)} className="block">
          <CrmStatCard label="Collected" value={collections ? inr(collections.total_collected) : "—"} icon={Wallet} tone="success" />
        </Link>
        <CrmStatCard label="Refunds" value={collections ? inr(collections.total_refunded) : "—"} />
        <CrmStatCard label="Net" value={collections ? inr(collections.net) : "—"} icon={CreditCard} />
        <Link to={appendScope("/reports/payments", scopeQuery)} className="block">
          <CrmStatCard label="Payment desk" value="Open →" icon={CreditCard} />
        </Link>
      </div>

      {/* Ops queues */}
      <div data-testid="ops-queues">
        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">Work queues</div>
        {errors.queues ? (
          <WidgetError message="Queues unavailable" onRetry={load} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUEUE_CARDS.map((q) => {
              const count = queueCount(queues, q.key);
              const Icon = q.icon;
              return (
                <Link key={q.key} to={appendScope(q.to, pickScope(scopeQuery, q.scopeKeys))} data-testid={`queue-${q.key}`}>
                  <CrmCard hover className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted leading-none">
                        {q.label}
                      </div>
                      <Icon className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    </div>
                    <div className={`font-mono text-xl font-semibold ${
                      q.tone === "danger" && count > 0 ? "text-danger"
                        : q.tone === "warning" && count > 0 ? "text-warning"
                          : "text-ink"
                    }`}>
                      {queues ? count : (loading.queues ? "…" : "—")}
                    </div>
                  </CrmCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <CrmTableCard>
          <CrmCardHeader label="Pipeline" title="By stage" />
          <div className="p-3 space-y-2.5">
            {errors.pipeline ? (
              <WidgetError message="Pipeline report failed" onRetry={load} />
            ) : pipeline?.by_stage && stageTotal > 0 ? (
              STAGE_ORDER.map((stage) => {
                const count = pipeline.by_stage[stage] ?? 0;
                return (
                  <Link key={stage} to={appendScope(`/pipeline?stage=${stage}`, scopeQuery)} className="block hover:opacity-90">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink capitalize">{STAGE_LABELS[stage]}</span>
                      <span className="font-mono text-ink-muted">{count}</span>
                    </div>
                    <MeterBar value={count} max={stageTotal || 1} height="h-1.5" tone="navy" />
                  </Link>
                );
              })
            ) : (
              <CrmEmptyState title="No open cases yet" />
            )}
          </div>
        </CrmTableCard>

        <CrmTableCard>
          <CrmCardHeader label="Collections" title="Trend" />
          <div className="h-48 p-3">
            {errors.collections ? (
              <WidgetError message="Collections unavailable" onRetry={load} />
            ) : trendData.length === 0 ? (
              <CrmEmptyState title="No ledger activity in range" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4D9C8" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Area type="monotone" dataKey="collected" stroke="#1F4A3A" fill="#2F6B5A33" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CrmTableCard>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <CrmTableCard>
          <CrmCardHeader label="Cases" title="Recent active" />
          <ul className="divide-y divide-border">
            {errors.recent ? (
              <li><WidgetError message="Recent cases failed" onRetry={load} /></li>
            ) : recent.length === 0 ? (
              <li><CrmEmptyState title="No cases yet" /></li>
            ) : (
              recent.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/cases/${c.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-surface-muted transition-colors"
                    data-testid={`recent-case-${c.id.slice(0, 6)}`}
                  >
                    <span className="text-lg shrink-0">{c.config_snapshot_json?.country_flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate">
                        {c.customer?.full_name || c.config_snapshot_json?.country_name}
                      </div>
                      <div className="text-[10px] font-mono text-ink-muted truncate">{formatCaseNumber(c)}</div>
                    </div>
                    <Stamp tone={slaColor[c.sla_status] ?? "muted"} size="sm">{c.stage}</Stamp>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CrmTableCard>

        <CrmTableCard data-testid="workload-panel">
          <CrmCardHeader
            label="Workload"
            title="Current workload"
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
          {errors.workload ? (
            <WidgetError message="Workload unavailable" onRetry={load} />
          ) : !workload ? (
            <div className="p-3">
              {[0, 1, 2, 3].map((i) => (
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
                  <th>SLA</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {workload.cases.slice(0, 10).map((c) => (
                  <tr key={c.id} className="clickable">
                    <td>
                      <Link to={`/cases/${c.id}`} className="font-mono text-navy hover:underline" data-testid={`workload-case-${c.id.slice(0, 6)}`}>
                        {formatCaseNumber(c)}
                      </Link>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        {c.country_flag ? <span>{c.country_flag}</span> : null}
                        <span>{c.country || "—"}</span>
                      </span>
                    </td>
                    <td className="text-ink">{c.customer_name || c.customer_full_name || "—"}</td>
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
    </div>
  );
}
