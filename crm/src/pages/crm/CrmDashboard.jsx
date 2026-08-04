import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  PauseCircle,
  RefreshCw,
  Target,
  TrendingUp,
  UserX,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { formatCaseNumber } from "@/lib/utils";
import Stamp from "@/components/Stamp";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { TeamScopeBanner } from "@/components/crm/TeamScopeBanner";
import DashboardCharts from "@/components/crm/dashboard/DashboardCharts";
import DashboardTeamTable from "@/components/crm/dashboard/DashboardTeamTable";
import DashboardWarnings, { DashboardQueueSections } from "@/components/crm/dashboard/DashboardWarnings";
import {
  CrmStatCard,
  CrmTableCard,
  CrmCardHeader,
  CrmEmptyState,
  CrmSkeleton,
} from "@/components/ui/crm-card";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { FilterPanel } from "@/components/ui/filter-panel";
import { Segmented } from "@/components/ui/segmented";
import { useListQueryState } from "@/hooks/useListQueryState";
import { SERVICE_TYPE_OPTIONS } from "@/lib/leadServiceSchemas";
import {
  appendScope,
  buildDashboardParams,
  detectPeriod,
  inr,
  periodToRange,
  QUICK_PERIODS,
  SLA_COLORS,
} from "@/lib/dashboardUtils";

const FILTER_KEYS = [
  "period", "from_date", "to_date", "service_type", "country", "source", "consultant_id",
  "stage", "sla", "payment_status", "case_type", "visa_type", "on_hold", "unassigned",
];

const LIST_DEFAULTS = { period: "30d", ...periodToRange("30d") };

const ease = [0.16, 1, 0.3, 1];

export default function CrmDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlInitialized = useRef(false);
  const list = useListQueryState({ filterKeys: FILTER_KEYS, defaults: LIST_DEFAULTS });

  const [data, setData] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workloadLoading, setWorkloadLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (urlInitialized.current) return;
    urlInitialized.current = true;
    const next = new URLSearchParams(searchParams);
    const hasFrom = next.get("from_date");
    const hasTo = next.get("to_date");
    const periodParam = next.get("period");
    if (!hasFrom || !hasTo) {
      const range = periodToRange(periodParam || "30d");
      next.set("period", periodParam || "30d");
      next.set("from_date", range.from_date);
      next.set("to_date", range.to_date);
    } else if (!periodParam) {
      const detected = detectPeriod(hasFrom, hasTo);
      if (detected) next.set("period", detected);
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const scopeParams = useMemo(
    () => buildDashboardParams(list.filters, list.q),
    [list.filters, list.q],
  );

  const scopeQuery = scopeParams;
  const activePeriod = useMemo(
    () => detectPeriod(list.filters.from_date, list.filters.to_date),
    [list.filters.from_date, list.filters.to_date],
  );

  const applyPeriod = useCallback((periodId) => {
    const { from_date, to_date } = periodToRange(periodId);
    list.setFilters({ period: periodId, from_date, to_date });
  }, [list]);

  const applyFilters = useCallback((draft) => {
    const from = draft.from_date ?? list.filters.from_date;
    const to = draft.to_date ?? list.filters.to_date;
    const period = detectPeriod(from, to);
    list.setFilters({ ...draft, period: period || "" });
  }, [list]);

  const clearFilters = useCallback(() => {
    const { from_date, to_date } = periodToRange("30d");
    const patch = { q: "", period: "30d", from_date, to_date };
    FILTER_KEYS.forEach((k) => {
      if (!["period", "from_date", "to_date"].includes(k)) patch[k] = "";
    });
    list.write(patch, { resetPage: false });
  }, [list]);

  const load = useCallback(() => {
    setLoading(true);
    setWorkloadLoading(true);
    api.get("/crm/reports/dashboard", { params: scopeParams })
      .then((r) => {
        setData(r.data);
        setLastUpdated(new Date());
      })
      .catch(() => {
        toast.error("Could not load dashboard");
        setData(null);
      })
      .finally(() => setLoading(false));

    api.get("/crm/workload")
      .then((r) => setWorkload(r.data))
      .catch(() => setWorkload(null))
      .finally(() => setWorkloadLoading(false));
  }, [scopeParams]);

  useEffect(() => { load(); }, [load]);

  const filterFields = useMemo(() => [
    { key: "range", label: "Date range", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    { key: "service_type", label: "Service type", type: "multiselect", options: SERVICE_TYPE_OPTIONS },
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
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [{ value: "online", label: "Online" }, { value: "offline", label: "Offline" }],
    },
    {
      key: "stage",
      label: "Stage",
      type: "multiselect",
      options: [
        { value: "new", label: "New" },
        { value: "docs_pending", label: "Docs pending" },
        { value: "ready_to_submit", label: "Ready" },
        { value: "submitted", label: "Submitted" },
        { value: "decision", label: "Decision" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      key: "sla",
      label: "SLA",
      type: "select",
      options: [
        { value: "on_track", label: "On track" },
        { value: "due_soon", label: "Due soon" },
        { value: "overdue", label: "Overdue" },
        { value: "completed", label: "Completed" },
      ],
    },
    {
      key: "payment_status",
      label: "Payment",
      type: "multiselect",
      options: [
        { value: "pending", label: "Pending" },
        { value: "paid", label: "Paid" },
        { value: "partial", label: "Partial" },
        { value: "refunded", label: "Refunded" },
      ],
    },
    {
      key: "case_type",
      label: "Case type",
      type: "select",
      options: [{ value: "visa", label: "Visa" }, { value: "passport", label: "Passport" }],
    },
  ], []);

  const kpis = data?.kpis || {};
  const payments = data?.payments || {};
  const recent = data?.recent_cases || [];

  const kpiCards = [
    { label: "Open", value: kpis.open ?? "—", icon: Briefcase, to: "/pipeline", tone: "default" },
    { label: "Overdue SLA", value: kpis.overdue_sla ?? "—", icon: AlertTriangle, to: "/pipeline?sla=overdue", tone: kpis.overdue_sla > 0 ? "danger" : "default" },
    { label: "Due soon", value: kpis.due_soon ?? "—", icon: Clock, to: "/pipeline?sla=due_soon", tone: kpis.due_soon > 0 ? "warning" : "default" },
    { label: "Unassigned", value: kpis.unassigned ?? "—", icon: UserX, to: "/pipeline?unassigned=true", tone: "default" },
    { label: "On hold", value: kpis.on_hold ?? "—", icon: PauseCircle, to: "/pipeline?on_hold=true", tone: "warning" },
    { label: "Docs review", value: kpis.docs_pending_review ?? "—", icon: FileCheck, to: "/pipeline?stage=docs_pending", tone: "default" },
    { label: "Closed", value: kpis.closed ?? "—", icon: CheckCircle2, to: "/cases/closed", tone: "default", delta: "in range" },
    { label: "Approval rate", value: kpis.approval_rate != null ? `${kpis.approval_rate}%` : "—", icon: Target, tone: "success" },
    { label: "Avg days to close", value: kpis.avg_days_to_close ?? "—", icon: TrendingUp, tone: "default" },
    { label: "Collected", value: payments.total_collected != null ? inr(payments.total_collected) : "—", icon: Wallet, to: "/reports/payments", tone: "success" },
    { label: "Refunds", value: payments.total_refunded != null ? inr(payments.total_refunded) : "—", icon: CreditCard, tone: "default" },
    { label: "Net", value: payments.net != null ? inr(payments.net) : "—", icon: Wallet, to: "/reports/payments", tone: "default" },
  ];

  return (
    <div className="p-3 lg:p-4 max-w-full space-y-2.5">
      <PageHeader
        label="Overview"
        title="Dashboard"
        subtitle="Operations command center — all service types, KPIs, and performance"
        actions={(
          <div className="flex items-center gap-3">
            <Segmented
              value={activePeriod || list.filters.period || "30d"}
              onChange={applyPeriod}
              segments={QUICK_PERIODS.map((p) => ({ value: p.id, label: p.label }))}
            />
            <div className="hidden lg:flex items-center gap-2 border-l border-border pl-3 ml-1">
              {lastUpdated && (
                <span className="text-[10px] font-mono text-ink-muted hidden xl:inline">
                  Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <CrmButton variant="outline" size="sm" onClick={load} data-testid="dashboard-refresh">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </CrmButton>
            </div>
          </div>
        )}
      />

      <TeamScopeBanner scope={data?.meta?.scope} entity="cases" testId="dashboard-scope" />

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        activeCount={list.activeFilterCount}
        onApply={applyFilters}
        onClear={clearFilters}
        onQChange={list.setQ}
        q={list.q}
        defaultOpen
        testId="dashboard-filters"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="dashboard-metrics">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.45, ease }}
          >
            {card.to ? (
              <Link to={appendScope(card.to, scopeQuery)} className="block">
                {loading ? <CrmSkeleton className="h-[100px]" /> : (
                  <CrmStatCard label={card.label} value={card.value} icon={card.icon} tone={card.tone} delta={card.delta} />
                )}
              </Link>
            ) : (
              loading ? <CrmSkeleton className="h-[100px]" /> : (
                <CrmStatCard label={card.label} value={card.value} icon={card.icon} tone={card.tone} delta={card.delta} />
              )
            )}
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
        <DashboardWarnings risk={data?.risk} scope={scopeQuery} loading={loading} />
      </motion.div>

      <DashboardCharts data={data} scope={scopeQuery} loading={loading} />

      <DashboardTeamTable team={data?.team} scope={scopeQuery} loading={loading} />

      <DashboardQueueSections queues={data?.queues} scope={scopeQuery} loading={loading} />

      <div className="grid md:grid-cols-2 gap-4">
        <CrmTableCard>
          <CrmCardHeader label="Cases" title="Recent active" />
          <ul className="divide-y divide-border">
            {loading ? (
              <li className="p-4 text-sm text-ink-muted">Loading…</li>
            ) : recent.length === 0 ? (
              <li><CrmEmptyState title="No cases in range" /></li>
            ) : (
              recent.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/cases/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <span className="text-lg shrink-0">{c.config_snapshot_json?.country_flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate">
                        {c.customer_full_name || c.config_snapshot_json?.country_name || c.config_snapshot_json?.title}
                      </div>
                      <div className="text-[10px] font-mono text-ink-muted truncate">{formatCaseNumber(c)}</div>
                    </div>
                    <Stamp tone={SLA_COLORS[c.stage === "closed" ? "completed" : "muted"] ?? "muted"} size="sm">
                      {c.stage}
                    </Stamp>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CrmTableCard>

        <CrmTableCard data-testid="workload-panel">
          <CrmCardHeader
            label="Workload"
            title="My open cases"
            actions={workload && (
              <div className="flex items-center gap-2">
                <Stamp tone="ink" size="sm">{workload.open} open</Stamp>
                <Stamp tone={workload.overdue > 0 ? "danger" : "muted"} size="sm">{workload.overdue} overdue</Stamp>
              </div>
            )}
          />
          {workloadLoading ? (
            <div className="p-4 text-sm text-ink-muted">Loading…</div>
          ) : !workload?.cases?.length ? (
            <CrmEmptyState title="No open cases assigned" description="You're all caught up." />
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Country</th>
                  <th>Customer</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {workload.cases.slice(0, 10).map((c) => (
                  <tr key={c.id} className="clickable">
                    <td>
                      <Link to={`/cases/${c.id}`} className="font-mono text-navy hover:underline font-medium">
                        {formatCaseNumber(c)}
                      </Link>
                    </td>
                    <td>{c.country || "—"}</td>
                    <td>{c.customer_name || "—"}</td>
                    <td>
                      <Stamp tone={SLA_COLORS[c.sla_status] ?? "muted"} size="sm">
                        {c.sla_status?.replace("_", " ") || "—"}
                      </Stamp>
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
