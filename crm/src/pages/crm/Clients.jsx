import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Briefcase, RefreshCw, Users, Wallet } from "lucide-react";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmStatCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { SERVICE_TYPE_LABELS, SERVICE_TYPE_OPTIONS } from "@/lib/leadServiceSchemas";

const FILTER_KEYS = ["service_type", "has_work", "has_open_work"];
const LIST_DEFAULTS = { limit: "25", sort_by: "total_work", sort_order: "desc" };

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export default function Clients() {
  const nav = useNavigate();
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/crm/clients", { params: list.apiParams })
      .then((r) => {
        const { items, meta: m, summary: s } = unwrapListResponse(r.data);
        setRows(items);
        setMeta(m);
        setSummary(s);
      })
      .catch(() => toast.error("Failed to load clients"))
      .finally(() => setLoading(false));
  }, [list.apiParams]);

  useEffect(() => {
    load();
  }, [load]);

  const filterFields = useMemo(
    () => [
      {
        key: "service_type",
        label: "Service",
        type: "select",
        options: SERVICE_TYPE_OPTIONS,
      },
      {
        key: "has_work",
        label: "Has work",
        type: "select",
        options: YES_NO,
      },
      {
        key: "has_open_work",
        label: "Has open work",
        type: "select",
        options: YES_NO,
      },
    ],
    [],
  );

  const columns = [
    {
      key: "full_name",
      label: "Contact",
      render: (row) => (
        <div className="flex flex-col gap-0.5 min-w-[160px]">
          <Link
            to={`/clients/${row.id}`}
            className="font-medium text-ink text-sm hover:text-teal hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.full_name || "—"}
          </Link>
          {row.email ? (
            <a
              href={`mailto:${row.email}`}
              className="font-mono text-xs text-teal hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.email}
            </a>
          ) : null}
          {row.phone ? (
            <a
              href={`tel:${row.phone}`}
              className="font-mono text-xs text-teal hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.phone}
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: "case_count",
      label: "Cases",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm">{row.case_count || 0}</span>
          {row.open_case_count > 0 && (
            <Stamp tone="warning" size="sm">{row.open_case_count} open</Stamp>
          )}
        </div>
      ),
    },
    {
      key: "service_order_count",
      label: "Orders",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm">{row.service_order_count || 0}</span>
          {row.open_order_count > 0 && (
            <Stamp tone="teal" size="sm">{row.open_order_count} open</Stamp>
          )}
        </div>
      ),
    },
    {
      key: "traveler_count",
      label: "Travelers",
      render: (row) => (
        <span className="font-mono text-sm">{row.traveler_count || 0}</span>
      ),
    },
    {
      key: "service_types",
      label: "Services",
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(row.service_types || []).length === 0 ? (
            <span className="text-xs text-ink-muted">—</span>
          ) : (
            (row.service_types || []).slice(0, 4).map((st) => (
              <Stamp key={st} tone="muted" size="sm">
                {SERVICE_TYPE_LABELS[st] || st}
              </Stamp>
            ))
          )}
        </div>
      ),
    },
    {
      key: "last_activity_at",
      label: "Last activity",
      render: (row) => (
        <span className="font-mono text-[11px] text-ink-muted">
          {row.last_activity_at
            ? new Date(row.last_activity_at).toLocaleDateString("en-IN")
            : "—"}
        </span>
      ),
    },
    {
      key: "total_paid_amount",
      label: "Paid",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.total_paid_amount ? INR.format(row.total_paid_amount) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        label="Customers"
        title="Clients"
        subtitle="All contacts ranked by cases, service orders, and family travelers"
        actions={
          <CrmButton variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </CrmButton>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.35 }}>
          <CrmStatCard label="Clients" value={summary?.total_clients ?? meta.total ?? "—"} icon={Users} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.35 }}>
          <CrmStatCard
            label="With open work"
            value={summary?.clients_with_open_work ?? "—"}
            tone={(summary?.clients_with_open_work || 0) > 0 ? "warning" : "default"}
            icon={Briefcase}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.35 }}>
          <CrmStatCard
            label="Total cases"
            value={summary?.total_cases ?? "—"}
            delta={summary?.total_orders != null ? `${summary.total_orders} orders` : undefined}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.35 }}>
          <CrmStatCard
            label="Paid revenue"
            value={summary?.total_paid_amount != null ? INR.format(summary.total_paid_amount) : "—"}
            icon={Wallet}
            delta={summary?.top10_paid_share != null ? `Top 10: ${summary.top10_paid_share}%` : undefined}
          />
        </motion.div>
      </div>

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search name, email, phone…"
        testId="clients-filters"
      />

      <PaginatedTable
        columns={columns}
        data={rows}
        loading={loading}
        empty={{ title: "No clients match filters" }}
        page={list.page}
        limit={list.limit}
        total={meta.total || 0}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        sortKey={list.sortBy}
        sortDir={list.sortOrder}
        onSortChange={list.setSort}
        serverSort
        onRowClick={(row) => nav(`/clients/${row.id}`)}
        testId="clients-table"
      />
    </div>
  );
}
