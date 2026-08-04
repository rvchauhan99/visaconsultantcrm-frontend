import React, { useMemo } from "react";
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
import { CrmEmptyState, CrmTableCard, CrmCardHeader } from "@/components/ui/crm-card";
import { MeterBar } from "@/components/ui/meter-bar";
import {
  appendScope,
  CHART_COLORS,
  inr,
  serviceTypeLabel,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/dashboardUtils";

function ChartShell({ label, title, children, empty }) {
  return (
    <CrmTableCard>
      <CrmCardHeader label={label} title={title} />
      <div className="h-56 p-4">
        {empty ? <CrmEmptyState title="No data in range" /> : children}
      </div>
    </CrmTableCard>
  );
}

export default function DashboardCharts({ data, scope, loading }) {
  const trend = data?.trend || [];
  const byService = data?.by_service_type || [];
  const byStage = data?.by_stage || [];
  const byCountry = data?.cases?.by_country || [];
  const bySla = data?.cases?.by_sla || {};
  const payments = data?.payments?.by_period || [];

  const slaPie = useMemo(() => ([
    { name: "On track", value: bySla.on_track || 0, color: CHART_COLORS[1] },
    { name: "Due soon", value: bySla.due_soon || 0, color: CHART_COLORS[2] },
    { name: "Overdue", value: bySla.overdue || 0, color: CHART_COLORS[4] },
    { name: "Completed", value: bySla.completed || 0, color: CHART_COLORS[5] },
  ].filter((x) => x.value > 0)), [bySla]);

  const stageTotal = STAGE_ORDER.reduce((a, s) => a + (byStage.find((r) => r.stage === s)?.count || 0), 0);

  if (loading) {
    return <div className="grid md:grid-cols-2 gap-4"><div className="h-56 rounded-xl bg-surface-muted animate-pulse" /><div className="h-56 rounded-xl bg-surface-muted animate-pulse" /></div>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartShell label="Volume" title="Created vs closed" empty={trend.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6E3DE" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={32} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="created" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="closed" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell label="Collections" title="Payment trend" empty={payments.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={payments.map((p) => ({ period: p.date, amount: p.amount }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6E3DE" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} />
            <Tooltip formatter={(v) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
            <Area type="monotone" dataKey="amount" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell label="Services" title="By service type" empty={byService.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byService.map((r) => ({ ...r, label: serviceTypeLabel(r.service_type) }))} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E6E3DE" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={90} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
            <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell label="SLA" title="Health breakdown" empty={slaPie.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slaPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
              {slaPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>

      <CrmTableCard>
        <CrmCardHeader label="Pipeline" title="Cases by stage" />
        <div className="p-4 space-y-3">
          {stageTotal > 0 ? STAGE_ORDER.filter((s) => s !== "closed").map((stage) => {
            const count = byStage.find((r) => r.stage === stage)?.count || 0;
            return (
              <a key={stage} href={appendScope(`/pipeline?stage=${stage}`, scope)} className="block">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-ink font-medium">{STAGE_LABELS[stage]}</span>
                  <span className="font-mono text-ink-muted">{count}</span>
                </div>
                <MeterBar value={count} max={stageTotal || 1} height="h-2" tone="navy" />
              </a>
            );
          }) : <CrmEmptyState title="No stage data" />}
        </div>
      </CrmTableCard>

      <CrmTableCard>
        <CrmCardHeader label="Geography" title="Top countries" />
        <div className="p-4 space-y-3">
          {(byCountry.slice(0, 8)).map((row) => (
            <div key={row.country_code}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-ink">{row.country_code}</span>
                <span className="font-mono text-ink-muted">{row.count}</span>
              </div>
              <MeterBar value={row.count} max={byCountry[0]?.count || 1} height="h-1.5" tone="gold" />
            </div>
          ))}
          {byCountry.length === 0 && <CrmEmptyState title="No country breakdown" />}
        </div>
      </CrmTableCard>
    </div>
  );
}
