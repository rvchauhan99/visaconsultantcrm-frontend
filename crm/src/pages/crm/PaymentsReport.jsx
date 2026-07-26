import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmStatCard, CrmTableCard, CrmCardHeader } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Segmented } from "@/components/ui/segmented";
import { BreakdownRow } from "@/components/ui/meter-bar";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { formatCaseNumber } from "@/lib/utils";
import { CreditCard, Download, RefreshCw, Wallet, AlertTriangle, TrendingUp } from "lucide-react";

const FILTER_KEYS = [
  "from_date", "to_date", "method", "payment_type", "country", "consultant_id",
];
const LIST_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc" };

function inr(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export default function PaymentsReport() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [summary, setSummary] = useState(null);
  const [receivables, setReceivables] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const scopeParams = useMemo(() => {
    const p = { ...list.filters };
    if (list.q) p.q = list.q;
    return p;
  }, [list.filters, list.q]);

  const load = useCallback(() => {
    setLoading(true);
    const listParams = { ...list.apiParams };
    Promise.all([
      api.get("/crm/payments", { params: listParams }),
      api.get("/crm/reports/payments", { params: scopeParams }),
      api.get("/crm/reports/receivables", { params: scopeParams }),
    ])
      .then(([listRes, sumRes, recvRes]) => {
        const { items, meta: m } = unwrapListResponse(listRes.data);
        setRows(items);
        setMeta(m);
        setSummary(sumRes.data);
        setReceivables(recvRes.data);
      })
      .catch(() => toast.error("Failed to load payments report"))
      .finally(() => setLoading(false));
  }, [list.apiParams, scopeParams]);

  useEffect(() => { load(); }, [load]);

  const filterFields = useMemo(() => [
    { key: "range", label: "Date range", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    {
      key: "method",
      label: "Method",
      type: "select",
      options: [
        { value: "upi", label: "UPI" },
        { value: "card", label: "Card" },
        { value: "neft", label: "NEFT" },
        { value: "cash", label: "Cash" },
        { value: "other", label: "Other" },
      ],
    },
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
  ], []);

  const columns = [
    {
      key: "created_at",
      label: "Date",
      render: (r) => (
        <span className="font-mono text-[11px]">
          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      key: "case_number",
      label: "Case",
      sortable: false,
      render: (r) => r.case_id ? (
        <Link to={`/cases/${r.case_id}`} className="font-mono text-navy hover:underline text-xs">
          {formatCaseNumber(r)}
        </Link>
      ) : "—",
    },
    {
      key: "payment_type",
      label: "Type",
      render: (r) => (
        <Stamp tone={r.payment_type === "refund" ? "danger" : "success"} size="sm">
          {r.payment_type || "payment"}
        </Stamp>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (r) => <span className="font-mono text-xs">{inr(r.amount)}</span>,
    },
    { key: "method", label: "Method", render: (r) => <span className="capitalize text-xs">{r.method || "—"}</span> },
    { key: "reference", label: "Reference", render: (r) => <span className="font-mono text-[11px] text-ink-muted">{r.reference || "—"}</span> },
    {
      key: "invoice_id",
      label: "Invoice",
      sortable: false,
      render: (r) => <span className="font-mono text-[11px]">#{(r.invoice_id || "").slice(0, 8) || "—"}</span>,
    },
  ];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api.get("/crm/reports/payments/export.csv", {
        params: scopeParams,
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payments-report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const methodMax = Math.max(1, ...(summary?.by_method || []).map((m) => m.amount || 0));
  const countryMax = Math.max(1, ...(summary?.by_country || []).map((m) => m.amount || 0));
  const consultantMax = Math.max(1, ...(summary?.by_consultant || []).map((m) => m.amount || 0));
  const agingMax = Math.max(1, ...(receivables?.aging || []).map((a) => a.outstanding || 0));

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        label="Finance"
        title="Payment reports"
        subtitle="Ledger collections and invoice receivables"
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

      <div
        className="rounded-md border border-navy/15 bg-navy/[0.03] px-3 py-2 text-xs text-ink-muted"
        data-testid="payments-source-callout"
      >
        <strong className="text-ink font-medium">Collections</strong> come from the payments ledger
        (invoice payments and paid case checkout).{" "}
        <strong className="text-ink font-medium">Receivables / outstanding</strong> are invoice-based only
        and will not include online case fees that never created an invoice.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="payments-kpis">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.35 }}>
          <CrmStatCard label="Collected" value={summary ? inr(summary.total_collected) : "—"} icon={Wallet} tone="success" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.35 }}>
          <CrmStatCard label="Outstanding" value={receivables ? inr(receivables.total_outstanding) : "—"} icon={CreditCard} tone="warning" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.35 }}>
          <CrmStatCard label="Overdue" value={receivables ? inr(receivables.total_overdue) : "—"} icon={AlertTriangle} tone={receivables?.total_overdue > 0 ? "danger" : "default"} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.35 }}>
          <CrmStatCard label="Net collected" value={summary ? inr(summary.net) : "—"} icon={TrendingUp} delta={summary ? `−${inr(summary.total_refunded)} refunds` : undefined} />
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
        searchPlaceholder="Search reference, notes…"
        testId="payments-filters"
      />

      <Segmented
        value={list.filters.payment_type || ""}
        onChange={(v) => list.setFilters({ payment_type: v })}
        segments={[
          { value: "", label: "All" },
          { value: "payment", label: "Payments" },
          { value: "refund", label: "Refunds" },
        ]}
        testId="payments-type-tabs"
      />

      <div className="grid md:grid-cols-2 gap-3">
        <CrmTableCard>
          <CrmCardHeader label="Collections" title="Trend" />
          <div className="h-48 p-3">
            {(summary?.by_period || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted">No collections in range</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.by_period}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4D9C8" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Area type="monotone" dataKey="amount" stroke="#1F4A3A" fill="#2F6B5A33" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CrmTableCard>

        <CrmTableCard>
          <CrmCardHeader label="Receivables" title="Aging" />
          <div className="p-3 space-y-2.5">
            {(receivables?.aging || []).map((a) => (
              <BreakdownRow
                key={a.key}
                label={`${a.label} (${a.count})`}
                value={a.outstanding}
                max={agingMax}
                formatValue={inr}
                color={a.key === "current" ? "bg-success" : a.key === "90_plus" ? "bg-danger" : "bg-warning"}
              />
            ))}
            {!receivables?.aging?.length && (
              <div className="text-xs text-ink-muted py-6 text-center">No outstanding invoices</div>
            )}
          </div>
        </CrmTableCard>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <CrmTableCard>
          <CrmCardHeader label="By" title="Method" />
          <div className="p-3 space-y-2">
            {(summary?.by_method || []).slice(0, 6).map((m) => (
              <BreakdownRow key={m.method} label={m.method || "—"} value={m.amount} max={methodMax} formatValue={inr} color="bg-teal" />
            ))}
          </div>
        </CrmTableCard>
        <CrmTableCard>
          <CrmCardHeader label="By" title="Country" />
          <div className="p-3 space-y-2">
            {(summary?.by_country || []).slice(0, 6).map((m) => (
              <BreakdownRow key={m.country_code} label={m.country_name || m.country_code} value={m.amount} max={countryMax} formatValue={inr} color="bg-navy" />
            ))}
          </div>
        </CrmTableCard>
        <CrmTableCard>
          <CrmCardHeader label="By" title="Consultant" />
          <div className="p-3 space-y-2">
            {(summary?.by_consultant || []).slice(0, 6).map((m) => (
              <BreakdownRow key={m.consultant_id} label={m.consultant_name} value={m.amount} max={consultantMax} formatValue={inr} color="bg-gold" />
            ))}
          </div>
        </CrmTableCard>
      </div>

      <PaginatedTable
        columns={columns}
        data={rows}
        loading={loading}
        empty={{ title: "No ledger entries match filters" }}
        page={list.page}
        limit={list.limit}
        total={meta.total || 0}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        sortKey={list.sortBy}
        sortDir={list.sortOrder}
        onSortChange={list.setSort}
        serverSort
        testId="payments-table"
      />
    </div>
  );
}
