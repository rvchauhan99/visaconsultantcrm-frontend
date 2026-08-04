import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format, subDays, subMonths, subYears, startOfDay } from "date-fns";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TeamScopeBanner } from "@/components/crm/TeamScopeBanner";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
  Clock,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { FOLLOW_UP_OUTCOMES } from "@/components/crm/AddLeadFollowUpForm";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import {
  CrmCard,
  CrmCardHeader,
  CrmEmptyState,
  CrmSkeleton,
  CrmStatCard,
  CrmTableCard,
} from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { MeterBar } from "@/components/ui/meter-bar";
import { Segmented } from "@/components/ui/segmented";
import { useListQueryState } from "@/hooks/useListQueryState";
import { SERVICE_TYPE_OPTIONS } from "@/lib/leadServiceSchemas";
import { cn } from "@/lib/utils";

const FILTER_KEYS = [
  "period", "status", "source", "country", "from_date", "to_date", "assigned_to",
  "due", "outcome", "visa_type", "service_type", "next_from", "next_to",
];

const ANALYTICS_API_KEYS = [
  "status", "source", "country", "from_date", "to_date", "assigned_to",
  "due", "outcome", "visa_type", "service_type", "next_from", "next_to",
];

const URL_NOISE_KEYS = ["page", "limit", "sort_by", "sort_order", "granularity"];

const QUICK_PERIODS = [
  { id: "7d", label: "7 days" },
  { id: "15d", label: "15 days" },
  { id: "30d", label: "30 days" },
  { id: "6m", label: "6 months" },
  { id: "1y", label: "1 year" },
];

function todayDate() {
  return startOfDay(new Date());
}

function isoDate(d) {
  return format(d, "yyyy-MM-dd");
}

function periodToRange(periodId) {
  const today = todayDate();
  let from = today;
  switch (periodId) {
    case "7d":
      from = subDays(today, 7);
      break;
    case "15d":
      from = subDays(today, 15);
      break;
    case "30d":
      from = subDays(today, 30);
      break;
    case "6m":
      from = subMonths(today, 6);
      break;
    case "1y":
      from = subYears(today, 1);
      break;
    default:
      from = subDays(today, 30);
  }
  return { from_date: isoDate(from), to_date: isoDate(today) };
}

function detectPeriod(from, to) {
  if (!from || !to) return "";
  for (const p of QUICK_PERIODS) {
    const range = periodToRange(p.id);
    if (range.from_date === from && range.to_date === to) return p.id;
  }
  return "";
}

const LIST_DEFAULTS = { period: "30d", ...periodToRange("30d") };

const CHART_COLORS = ["#1F4A3A", "#2F6B5A", "#C4A052", "#B45309", "#DC2626", "#64748B", "#0EA5E9"];
const GRID_STROKE = "#E4D9C8";
const STATUS_COLORS = {
  new: "#2F6B5A",
  contacted: "#64748B",
  qualified: "#1F4A3A",
  converted: "#C4A052",
  lost: "#DC2626",
};

const STAGE_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

function inr(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function formatPeriod(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function RiskRow({ label, bucket, tone, filterLink, valueLabel }) {
  if (!bucket) return null;
  return (
    <Link
      to={filterLink}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-0",
        "hover:bg-surface-muted/40 transition-colors",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          "w-2 h-2 rounded-full shrink-0",
          tone === "danger" && "bg-danger",
          tone === "warning" && "bg-warning",
          tone === "muted" && "bg-ink-muted",
        )}
        />
        <span className="text-sm text-ink truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm font-semibold text-ink">{bucket.count}</div>
        <div className="text-[10px] text-ink-muted font-mono">{valueLabel(bucket.value)}</div>
      </div>
    </Link>
  );
}

export default function LeadsAnalytics() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlInitialized = useRef(false);
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamSort, setTeamSort] = useState({ key: "total", dir: "desc" });

  useEffect(() => {
    if (urlInitialized.current) return;
    urlInitialized.current = true;

    const next = new URLSearchParams(searchParams);
    URL_NOISE_KEYS.forEach((k) => next.delete(k));

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

  const scopeParams = useMemo(() => {
    const p = {};
    for (const key of ANALYTICS_API_KEYS) {
      const v = list.filters[key];
      if (v != null && v !== "") p[key] = v;
    }
    if (list.q) p.q = list.q;
    if (!p.to_date && p.from_date) p.to_date = isoDate(todayDate());
    if (!p.from_date && p.to_date) {
      const fallback = periodToRange(list.filters.period || "30d");
      p.from_date = fallback.from_date;
    }
    if (!p.from_date && !p.to_date) {
      const fallback = periodToRange(list.filters.period || "30d");
      p.from_date = fallback.from_date;
      p.to_date = fallback.to_date;
    }
    return p;
  }, [list.filters, list.q]);

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
      if (k !== "period" && k !== "from_date" && k !== "to_date") patch[k] = "";
    });
    list.write(patch, { resetPage: false });
  }, [list]);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/crm/reports/leads", { params: scopeParams })
      .then((r) => setData(r.data))
      .catch(() => {
        toast.error("Could not load lead analytics");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [scopeParams]);

  useEffect(() => { load(); }, [load]);

  const filterFields = useMemo(() => [
    { key: "range", label: "Created", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "converted", label: "Converted" },
        { value: "lost", label: "Lost" },
      ],
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [
        { value: "website", label: "Website" },
        { value: "referral", label: "Referral" },
        { value: "walk_in", label: "Walk-in" },
        { value: "phone", label: "Phone" },
        { value: "partner", label: "Partner" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "service_type", label: "Service", type: "multiselect", options: SERVICE_TYPE_OPTIONS },
    {
      key: "outcome",
      label: "Last result",
      type: "multiselect",
      options: FOLLOW_UP_OUTCOMES.map((o) => ({ value: o.value, label: o.label })),
    },
    { key: "visa_type", label: "Visa type", type: "text", placeholder: "e.g. tourist" },
    {
      key: "country",
      label: "Country",
      type: "async",
      render: (value, onChange) => (
        <CountrySelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All countries" />
      ),
    },
    {
      key: "assigned_to",
      label: "Assignee",
      type: "async",
      render: (value, onChange) => (
        <ConsultantSelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All consultants" />
      ),
    },
    {
      key: "due",
      label: "Follow-up due",
      type: "select",
      options: [
        { value: "today", label: "Today" },
        { value: "overdue", label: "Overdue" },
        { value: "upcoming", label: "Upcoming" },
      ],
    },
    { key: "next_range", label: "Next follow-up", type: "daterange", fromKey: "next_from", toKey: "next_to" },
  ], []);

  const sortedTeam = useMemo(() => {
    const rows = [...(data?.team || [])];
    const { key, dir } = teamSort;
    rows.sort((a, b) => {
      const av = a[key] ?? 0;
      const bv = b[key] ?? 0;
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [data?.team, teamSort]);

  const statusPie = useMemo(() => (
    (data?.by_status || []).map((s) => ({
      name: STAGE_LABELS[s.status] || s.status,
      value: s.count,
      key: s.status,
    }))
  ), [data?.by_status]);

  const sourcePie = useMemo(() => (
    (data?.by_source || []).slice(0, 8).map((s) => ({
      name: s.source,
      value: s.count,
    }))
  ), [data?.by_source]);

  const funnelData = useMemo(() => (
    (data?.funnel || []).map((f) => ({
      stage: STAGE_LABELS[f.stage] || f.stage,
      count: f.count,
      cumulative: f.cumulative,
    }))
  ), [data?.funnel]);

  const serviceData = useMemo(() => (
    (data?.by_service_type || []).slice(0, 8).map((s) => ({
      name: (SERVICE_TYPE_OPTIONS.find((o) => o.value === s.service_type)?.label) || s.service_type,
      count: s.count,
      value: s.value,
    }))
  ), [data?.by_service_type]);

  const countryData = useMemo(() => (
    (data?.by_country || []).slice(0, 10).map((c) => ({
      name: c.country_code,
      count: c.count,
    }))
  ), [data?.by_country]);

  const teamMax = Math.max(1, ...(data?.team || []).map((t) => t.total || 0));

  const leadsLink = (extra = {}) => {
    const p = new URLSearchParams();
    Object.entries({ ...list.filters, ...extra }).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const qs = p.toString();
    return qs ? `/leads?${qs}` : "/leads";
  };

  const toggleTeamSort = (key) => {
    setTeamSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  };

  const kpis = data?.kpis;

  return (
    <div className="p-4 space-y-3 min-h-full">
      <PageHeader
        label="Leads"
        title="Lead analytics"
        subtitle={
          kpis
            ? `${kpis.total_leads} leads · ${kpis.conversion_rate}% conversion · ${inr(kpis.total_pipeline_value)} pipeline`
            : "Insights across your lead funnel"
        }
        actions={
          <>
            <CrmButton variant="outline" size="sm" onClick={() => nav(leadsLink())}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back to leads
            </CrmButton>
            <Segmented
              value={activePeriod}
              onChange={applyPeriod}
              segments={QUICK_PERIODS.map((p) => ({ value: p.id, label: p.label }))}
              size="sm"
              testId="leads-analytics-period"
            />
            <CrmButton variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </CrmButton>
          </>
        }
      />

      <TeamScopeBanner scope={data?.meta?.scope} entity="leads" testId="leads-analytics-scope" />

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={applyFilters}
        onClear={clearFilters}
        searchPlaceholder="Search name, email, phone…"
        defaultOpen
        testId="leads-analytics-filters"
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <CrmSkeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !data ? (
        <CrmEmptyState
          icon={BarChart2}
          title="No analytics data"
          description="Adjust filters or try again."
          action={<CrmButton variant="outline" size="sm" onClick={load}>Retry</CrmButton>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="leads-analytics-kpis">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <CrmStatCard label="Total leads" value={kpis.total_leads} icon={Users} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <CrmStatCard label="Open" value={kpis.open} icon={Target} tone="warning" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <CrmStatCard label="Converted" value={kpis.converted} icon={TrendingUp} tone="success" delta={`${kpis.conversion_rate}% rate`} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <CrmStatCard label="Lost rate" value={`${kpis.lost_rate}%`} icon={AlertTriangle} tone={kpis.lost_rate > 20 ? "danger" : "default"} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <CrmStatCard label="Pipeline value" value={inr(kpis.total_pipeline_value)} icon={Wallet} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <CrmStatCard label="Converted value" value={inr(kpis.converted_value)} icon={Wallet} tone="success" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <CrmStatCard label="Avg lead value" value={inr(kpis.avg_lead_value)} icon={Wallet} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <CrmStatCard
                label="Avg days to convert"
                value={kpis.avg_days_to_convert != null ? kpis.avg_days_to_convert : "—"}
                icon={Clock}
              />
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <CrmCard className="lg:col-span-2 p-4">
              <CrmCardHeader label="Trend" title="Lead volume & conversion" className="px-0 pt-0 border-0" />
              <div className="h-64 mt-2">
                {(data.trend || []).length === 0 ? (
                  <CrmEmptyState title="No trend data" className="py-8" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} tickFormatter={formatPeriod} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={36} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={36} unit="%" />
                      <Tooltip
                        labelFormatter={formatPeriod}
                        formatter={(v, name) => [
                          name === "conversion_rate" ? `${v}%` : v,
                          name === "conversion_rate" ? "Conv. rate" : name,
                        ]}
                      />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="created" name="Created" stroke={CHART_COLORS[0]} fill={`${CHART_COLORS[1]}33`} strokeWidth={2} />
                      <Area yAxisId="left" type="monotone" dataKey="converted" name="Converted" stroke={CHART_COLORS[2]} fill={`${CHART_COLORS[2]}33`} strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="conversion_rate" name="conversion_rate" stroke={CHART_COLORS[4]} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CrmCard>

            <CrmCard className="p-4">
              <CrmCardHeader label="Mix" title="By status" className="px-0 pt-0 border-0" />
              <div className="h-64 mt-2">
                {statusPie.length === 0 ? (
                  <CrmEmptyState title="No status data" className="py-8" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {statusPie.map((entry) => (
                          <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || CHART_COLORS[5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CrmCard>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <CrmCard className="p-4">
              <CrmCardHeader label="Mix" title="By source" className="px-0 pt-0 border-0" />
              <div className="h-52 mt-2">
                {sourcePie.length === 0 ? (
                  <CrmEmptyState title="No source data" className="py-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourcePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                        {sourcePie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CrmCard>

            <CrmCard className="p-4">
              <CrmCardHeader label="Funnel" title="Pipeline stages" className="px-0 pt-0 border-0" />
              <div className="h-52 mt-2">
                {funnelData.length === 0 ? (
                  <CrmEmptyState title="No funnel data" className="py-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={72} />
                      <Tooltip />
                      <Bar dataKey="cumulative" name="Reached" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CrmCard>

            <CrmCard className="p-4">
              <CrmCardHeader label="Services" title="By service type" className="px-0 pt-0 border-0" />
              <div className="h-52 mt-2">
                {serviceData.length === 0 ? (
                  <CrmEmptyState title="No service data" className="py-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={48} />
                      <YAxis tick={{ fontSize: 10 }} width={32} />
                      <Tooltip />
                      <Bar dataKey="count" name="Leads" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CrmCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <CrmCard className="overflow-hidden">
              <CrmCardHeader label="Risk" title="Warnings & attention needed" />
              <RiskRow
                label="Overdue follow-ups"
                bucket={data.risk?.overdue_follow_ups}
                tone="danger"
                valueLabel={inr}
                filterLink={leadsLink({ due: "overdue" })}
              />
              <RiskRow
                label="Due today"
                bucket={data.risk?.due_today}
                tone="warning"
                valueLabel={inr}
                filterLink={leadsLink({ due: "today" })}
              />
              <RiskRow
                label="Never contacted"
                bucket={data.risk?.never_contacted}
                tone="muted"
                valueLabel={inr}
                filterLink={leadsLink()}
              />
              <RiskRow
                label="Stale 14+ days"
                bucket={data.risk?.stale_14d}
                tone="warning"
                valueLabel={inr}
                filterLink={leadsLink()}
              />
              <RiskRow
                label="Unassigned"
                bucket={data.risk?.unassigned}
                tone="danger"
                valueLabel={inr}
                filterLink={leadsLink()}
              />
            </CrmCard>

            <CrmCard className="overflow-hidden">
              <CrmCardHeader label="At risk" title="High-value overdue leads" />
              {(data.risk?.high_value_at_risk || []).length === 0 ? (
                <CrmEmptyState title="No high-value overdue leads" className="py-8" />
              ) : (
                <div className="divide-y divide-border">
                  {(data.risk.high_value_at_risk || []).map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => nav(`/leads?status=${lead.status || ""}`)}
                      className="w-full text-left px-4 py-3 hover:bg-surface-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink truncate">{lead.full_name}</div>
                          <div className="text-[11px] text-ink-muted capitalize">
                            {lead.service_type} · {lead.assigned_name || "Unassigned"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm font-semibold text-danger">{inr(lead.lead_value)}</div>
                          <div className="text-[10px] text-ink-muted">{STAGE_LABELS[lead.status] || lead.status}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CrmCard>
          </div>

          <CrmCard className="p-4">
            <CrmCardHeader label="Countries" title="Top destinations" className="px-0 pt-0 border-0 pb-3" />
            <div className="h-56">
              {countryData.length === 0 ? (
                <CrmEmptyState title="No country data" className="py-6" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryData} layout="vertical" margin={{ left: 4, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Bar dataKey="count" name="Leads" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CrmCard>

          <CrmTableCard>
            <CrmCardHeader label="Team" title={data.meta?.scope === "admin" ? "Consultant performance" : "Your team performance"} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/30">
                    {[
                      ["consultant_name", "Consultant"],
                      ["total", "Total"],
                      ["open", "Open"],
                      ["converted", "Converted"],
                      ["conversion_rate", "Conv %"],
                      ["lost", "Lost"],
                      ["overdue", "Overdue"],
                      ["value", "Pipeline"],
                      ["converted_value", "Won"],
                    ].map(([key, label]) => (
                      <th key={key} className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] text-ink-muted">
                        <button type="button" onClick={() => toggleTeamSort(key)} className="hover:text-ink">
                          {label}
                          {teamSort.key === key && (teamSort.dir === "asc" ? " ↑" : " ↓")}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTeam.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-ink-muted">No team data</td>
                    </tr>
                  ) : sortedTeam.map((row) => (
                    <tr key={row.consultant_id} className="border-b border-border/60 hover:bg-surface-muted/20">
                      <td className="px-3 py-2.5 font-medium text-ink">{row.consultant_name}</td>
                      <td className="px-3 py-2.5 font-mono">{row.total}</td>
                      <td className="px-3 py-2.5 font-mono">{row.open}</td>
                      <td className="px-3 py-2.5 font-mono text-success">{row.converted}</td>
                      <td className="px-3 py-2.5 min-w-[120px]">
                        <MeterBar value={row.conversion_rate} max={100} height={6} tone="success" showLabel label={`${row.conversion_rate}%`} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-danger">{row.lost}</td>
                      <td className="px-3 py-2.5 font-mono text-warning">{row.overdue}</td>
                      <td className="px-3 py-2.5 font-mono">{inr(row.value)}</td>
                      <td className="px-3 py-2.5 font-mono text-success">{inr(row.converted_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedTeam.length > 0 && (
              <div className="px-3 py-2 border-t border-border text-[10px] text-ink-muted font-mono">
                Relative load (by total leads)
                {sortedTeam.slice(0, 5).map((row) => (
                  <div key={`bar-${row.consultant_id}`} className="mt-1.5">
                    <MeterBar
                      value={row.total}
                      max={teamMax}
                      label={row.consultant_name}
                      showLabel
                      height={5}
                    />
                  </div>
                ))}
              </div>
            )}
          </CrmTableCard>
        </>
      )}
    </div>
  );
}
