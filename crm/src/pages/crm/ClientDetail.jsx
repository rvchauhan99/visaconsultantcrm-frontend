import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Briefcase,
  Layers,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
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
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Segmented } from "@/components/ui/segmented";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { SERVICE_TYPE_LABELS } from "@/lib/leadServiceSchemas";
import { formatCaseNumber } from "@/lib/utils";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CHART_COLORS = ["#1f4a3a", "#2f6b5a", "#c9a227", "#9b3d32", "#5b7c99", "#7a5c3e"];

const HISTORY_FILTER_KEYS = ["kind", "status", "from_date", "to_date"];
const HISTORY_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc" };

const KIND_OPTIONS = [
  { value: "case", label: "Cases" },
  { value: "service_order", label: "Service orders" },
];

function formatDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("en-IN");
  } catch {
    return String(v).slice(0, 10);
  }
}

export default function ClientDetail() {
  const { customerId } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const historyList = useListQueryState({
    filterKeys: HISTORY_FILTER_KEYS,
    defaults: HISTORY_DEFAULTS,
  });
  const [historyRows, setHistoryRows] = useState([]);
  const [historyMeta, setHistoryMeta] = useState({ total: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadDetail = useCallback(() => {
    setLoading(true);
    api
      .get(`/crm/clients/${customerId}`)
      .then((r) => setDetail(r.data))
      .catch(() => {
        toast.error("Client not found");
        nav("/clients");
      })
      .finally(() => setLoading(false));
  }, [customerId, nav]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const loadHistory = useCallback(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    api
      .get(`/crm/clients/${customerId}/history`, { params: historyList.apiParams })
      .then((r) => {
        const { items, meta } = unwrapListResponse(r.data);
        setHistoryRows(items);
        setHistoryMeta(meta);
      })
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setHistoryLoading(false));
  }, [customerId, historyList.apiParams, tab]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (tab !== "analysis") return;
    setAnalyticsLoading(true);
    api
      .get(`/crm/clients/${customerId}/analytics`)
      .then((r) => setAnalytics(r.data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setAnalyticsLoading(false));
  }, [tab, customerId]);

  const customer = detail?.customer;
  const rollup = detail?.rollup || {};

  const travelerColumns = [
    {
      key: "full_name",
      label: "Traveler",
      render: (t) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{t.full_name || "—"}</span>
          {t.relationship && (
            <Stamp tone="teal" size="sm">{t.relationship}</Stamp>
          )}
        </div>
      ),
    },
    {
      key: "dob",
      label: "DOB",
      render: (t) => <span className="font-mono text-xs">{t.dob || "—"}</span>,
    },
    {
      key: "passport_number_masked",
      label: "Passport",
      render: (t) => (
        <span className="font-mono text-xs">{t.passport_number_masked || "—"}</span>
      ),
    },
    {
      key: "passport_expiry_date",
      label: "Expiry",
      render: (t) => (
        <span className="font-mono text-xs">{t.passport_expiry_date || "—"}</span>
      ),
    },
  ];

  const historyFilterFields = useMemo(
    () => [
      { key: "kind", label: "Type", type: "select", options: KIND_OPTIONS },
      { key: "status", label: "Status", type: "text", placeholder: "e.g. closed" },
      {
        key: "created",
        label: "Created",
        type: "daterange",
        fromKey: "from_date",
        toKey: "to_date",
      },
    ],
    [],
  );

  const historyColumns = [
    {
      key: "created_at",
      label: "Date",
      render: (row) => (
        <span className="font-mono text-[11px] text-ink-muted">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: "kind",
      label: "Type",
      render: (row) => (
        <Stamp tone={row.kind === "case" ? "ink" : "teal"} size="sm">
          {row.kind === "case" ? "Case" : "Order"}
        </Stamp>
      ),
    },
    {
      key: "title",
      label: "Title",
      sortable: false,
      render: (row) => {
        if (row.kind === "case") {
          return (
            <Link to={`/cases/${row.id}`} className="text-sm text-navy hover:underline">
              <span className="font-mono text-[10px] text-ink-muted mr-1">
                {formatCaseNumber(row)}
              </span>
              {row.title}
            </Link>
          );
        }
        return (
          <Link
            to={`/service-orders?q=${encodeURIComponent(row.id)}`}
            className="text-sm text-navy hover:underline"
          >
            {row.title}
          </Link>
        );
      },
    },
    {
      key: "traveler_name",
      label: "Traveler",
      sortable: false,
      render: (row) => <span className="text-xs">{row.traveler_name || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Stamp tone="muted" size="sm">{row.status || "—"}</Stamp>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.amount ? INR.format(row.amount) : "—"}
        </span>
      ),
    },
  ];

  if (loading && !detail) {
    return (
      <div className="p-4 space-y-3">
        <CrmSkeleton className="h-10 w-64" />
        <CrmSkeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        label="Clients"
        title={customer?.full_name || "Client"}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted">Contact</span>
            {customer?.email && (
              <a href={`mailto:${customer.email}`} className="font-mono text-xs text-teal hover:underline">
                {customer.email}
              </a>
            )}
            {customer?.phone && (
              <a href={`tel:${customer.phone}`} className="font-mono text-xs text-teal hover:underline">
                {customer.phone}
              </a>
            )}
          </span>
        }
        actions={
          <>
            <CrmButton variant="outline" size="sm" onClick={() => nav("/clients")}>
              <ArrowLeft className="w-3.5 h-3.5" /> All clients
            </CrmButton>
            <CrmButton variant="outline" size="sm" onClick={loadDetail}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </CrmButton>
          </>
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        testId="client-tabs"
        segments={[
          { value: "overview", label: "Overview" },
          { value: "history", label: "History" },
          { value: "analysis", label: "Analysis" },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <CrmStatCard label="Cases" value={rollup.case_count || 0} icon={Briefcase} delta={rollup.open_case_count ? `${rollup.open_case_count} open` : undefined} />
            <CrmStatCard label="Service orders" value={rollup.service_order_count || 0} icon={Layers} delta={rollup.open_order_count ? `${rollup.open_order_count} open` : undefined} />
            <CrmStatCard label="Travelers" value={rollup.traveler_count || 0} icon={Users} />
            <CrmStatCard
              label="Paid"
              value={rollup.total_paid_amount ? INR.format(rollup.total_paid_amount) : "—"}
              icon={Wallet}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <CrmCard className="p-4">
              <CrmCardHeader label="Contact person" title={customer?.full_name || "—"} />
              <div className="mt-3 space-y-1 text-sm">
                <div>
                  {customer?.email ? (
                    <a href={`mailto:${customer.email}`} className="font-mono text-xs text-teal hover:underline">
                      {customer.email}
                    </a>
                  ) : (
                    <span className="text-ink-muted text-xs">No email</span>
                  )}
                </div>
                <div>
                  {customer?.phone ? (
                    <a href={`tel:${customer.phone}`} className="font-mono text-xs text-teal hover:underline">
                      {customer.phone}
                    </a>
                  ) : (
                    <span className="text-ink-muted text-xs">No phone</span>
                  )}
                </div>
                {customer?.dob && (
                  <div className="text-xs text-ink-muted">DOB · <span className="font-mono">{customer.dob}</span></div>
                )}
                {customer?.created_at && (
                  <div className="text-xs text-ink-muted">Client since · {formatDate(customer.created_at)}</div>
                )}
                <div className="flex flex-wrap gap-1 pt-2">
                  {(rollup.service_types || []).map((st) => (
                    <Stamp key={st} tone="muted" size="sm">
                      {SERVICE_TYPE_LABELS[st] || st}
                    </Stamp>
                  ))}
                </div>
              </div>
            </CrmCard>

            <CrmCard className="p-4">
              <CrmCardHeader label="Recent work" title="Latest cases & orders" />
              <div className="mt-3 space-y-2">
                {(detail?.recent_work || []).length === 0 ? (
                  <CrmEmptyState title="No work yet" description="No cases or service orders for this client." />
                ) : (
                  (detail.recent_work || []).map((w) => (
                    <div
                      key={`${w.kind}-${w.id}`}
                      className="flex items-start justify-between gap-2 border-b border-border last:border-0 pb-2 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Stamp tone={w.kind === "case" ? "ink" : "teal"} size="sm">
                            {w.kind === "case" ? "Case" : "Order"}
                          </Stamp>
                          <Stamp tone="muted" size="sm">{w.status}</Stamp>
                        </div>
                        {w.kind === "case" ? (
                          <Link to={`/cases/${w.id}`} className="text-sm text-navy hover:underline truncate block">
                            {w.title}
                          </Link>
                        ) : (
                          <span className="text-sm truncate block">{w.title}</span>
                        )}
                        {w.traveler_name && (
                          <div className="text-[11px] text-ink-muted">Traveler · {w.traveler_name}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[11px] text-ink-muted">{formatDate(w.created_at)}</div>
                        {w.amount ? (
                          <div className="font-mono text-xs">{INR.format(w.amount)}</div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CrmCard>
          </div>

          <CrmTableCard>
            <div className="px-4 pt-4 pb-2">
              <CrmCardHeader label="Family" title="Traveler profiles" />
            </div>
            <DataTable
              columns={travelerColumns}
              data={detail?.travelers || []}
              density="compact"
              empty={{
                title: "No saved travelers",
                description: "Traveler profiles appear when the client saves family members.",
              }}
            />
          </CrmTableCard>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          <FilterPanel
            fields={historyFilterFields}
            values={historyList.filters}
            activeCount={historyList.activeFilterCount}
            onApply={historyList.setFilters}
            onClear={historyList.clearFilters}
            testId="client-history-filters"
          />
          <PaginatedTable
            columns={historyColumns}
            data={historyRows}
            loading={historyLoading}
            empty={{ title: "No history for this client" }}
            page={historyList.page}
            limit={historyList.limit}
            total={historyMeta.total || 0}
            onPageChange={historyList.setPage}
            onLimitChange={historyList.setLimit}
            testId="client-history-table"
          />
        </div>
      )}

      {tab === "analysis" && (
        <ClientAnalysis analytics={analytics} loading={analyticsLoading} />
      )}
    </div>
  );
}

function ClientAnalysis({ analytics, loading }) {
  if (loading && !analytics) {
    return <CrmSkeleton className="h-64" />;
  }
  if (!analytics) {
    return <CrmEmptyState title="No analytics" description="Could not load client analysis." />;
  }

  const totals = analytics.totals || {};
  const serviceMix = analytics.service_mix || [];
  const activity = analytics.activity_series || [];
  const openClosed = analytics.open_vs_closed || [];
  const travelerMix = analytics.traveler_mix || [];
  const countryMix = (analytics.country_mix || []).slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CrmStatCard label="Cases" value={totals.cases || 0} delta={`${totals.open_cases || 0} open`} />
        <CrmStatCard label="Orders" value={totals.service_orders || 0} delta={`${totals.open_orders || 0} open`} />
        <CrmStatCard label="Travelers" value={totals.traveler_profiles || 0} />
        <CrmStatCard
          label="Paid revenue"
          value={totals.paid_revenue ? INR.format(totals.paid_revenue) : "—"}
          icon={Wallet}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <CrmCard className="p-4">
          <CrmCardHeader label="Mix" title="Services applied" />
          {serviceMix.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-ink-muted">No services yet</div>
          ) : (
            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceMix}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ label, count }) => `${label} (${count})`}
                  >
                    {serviceMix.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CrmCard>

        <CrmCard className="p-4">
          <CrmCardHeader label="Status" title="Open vs closed" />
          {openClosed.every((x) => !x.count) ? (
            <div className="h-48 flex items-center justify-center text-sm text-ink-muted">No work yet</div>
          ) : (
            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={openClosed}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,40,32,0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1f4a3a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CrmCard>

        <CrmCard className="p-4 md:col-span-2">
          <CrmCardHeader label="Trend" title="Activity · last 12 months" />
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,40,32,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="cases" stackId="1" stroke="#1f4a3a" fill="#1f4a3a" fillOpacity={0.35} name="Cases" />
                <Area type="monotone" dataKey="orders" stackId="1" stroke="#c9a227" fill="#c9a227" fillOpacity={0.35} name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CrmCard>

        <CrmCard className="p-4">
          <CrmCardHeader label="Travelers" title="Relationship mix" />
          {travelerMix.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-muted">No traveler profiles</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {travelerMix.map((t) => (
                <li key={t.relationship} className="flex items-center justify-between text-sm">
                  <Stamp tone="teal" size="sm">{t.relationship}</Stamp>
                  <span className="font-mono text-xs">{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CrmCard>

        <CrmCard className="p-4">
          <CrmCardHeader label="Visa countries" title="Case destinations" />
          {countryMix.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-muted">No visa cases</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {countryMix.map((c) => (
                <li key={c.country} className="flex items-center justify-between text-sm">
                  <span>{c.country}</span>
                  <span className="font-mono text-xs">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CrmCard>
      </div>
    </div>
  );
}
