import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { PhoneCall, Plus, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Segmented } from "@/components/ui/segmented";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import Stamp from "@/components/Stamp";
import { cn } from "@/lib/utils";
import AddLeadFollowUpForm, {
  FOLLOW_UP_OUTCOMES,
  FOLLOW_UP_CHANNELS,
} from "@/components/crm/AddLeadFollowUpForm";
import { CrmInput } from "@/components/ui/crm-field";

const STATUS_TONE = {
  new: "teal",
  contacted: "muted",
  qualified: "success",
  converted: "gold",
  lost: "danger",
};

const OUTCOME_TONE = {
  interested: "success",
  converted: "gold",
  not_interested: "danger",
  wrong_number: "danger",
  invalid: "danger",
  no_answer: "warning",
  switched_off: "warning",
  callback: "teal",
  follow_up: "muted",
};

const FILTER_KEYS = [
  "status", "outcome", "channel", "source", "country", "assigned_to", "visa_type",
  "due", "from_date", "to_date", "next_from", "next_to", "contacted_from", "contacted_to",
];
const LIST_DEFAULTS = {
  limit: "25",
  sort_by: "next_follow_up_at",
  sort_order: "asc",
  due: "today",
};

function formatDue(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export default function LeadFollowUps() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ today: 0, overdue: 0 });
  const [fuModal, setFuModal] = useState(null);
  const [pickLead, setPickLead] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadHits, setLeadHits] = useState([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { ...list.apiParams };
    if (!params.due) params.due = "today";
    Promise.all([
      api.get("/crm/lead-follow-ups", { params }),
      api.get("/crm/lead-follow-ups/counts"),
    ])
      .then(([listRes, countRes]) => {
        const { items, meta: m } = unwrapListResponse(listRes.data);
        setRows(items);
        setMeta(m);
        setCounts(countRes.data || { today: 0, overdue: 0 });
      })
      .catch(() => toast.error("Failed to load follow-ups"))
      .finally(() => setLoading(false));
  }, [list.apiParams]);

  useEffect(() => { load(); }, [load]);

  const searchLeads = async (q) => {
    setLeadSearch(q);
    if (!q || q.length < 2) {
      setLeadHits([]);
      return;
    }
    setSearching(true);
    try {
      const r = await api.get("/crm/leads", {
        params: { q, page: 1, limit: 10, status: "new,contacted,qualified" },
      });
      const { items } = unwrapListResponse(r.data);
      setLeadHits(items);
    } catch {
      setLeadHits([]);
    } finally {
      setSearching(false);
    }
  };

  const filterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
      ],
    },
    {
      key: "outcome",
      label: "Result",
      type: "select",
      options: FOLLOW_UP_OUTCOMES.map((o) => ({ value: o.value, label: o.label })),
    },
    {
      key: "channel",
      label: "Channel",
      type: "select",
      options: FOLLOW_UP_CHANNELS.map((c) => ({ value: c.value, label: c.label })),
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
    {
      key: "visa_type",
      label: "Visa type",
      type: "select",
      options: [
        { value: "tourist", label: "Tourist" },
        { value: "business", label: "Business" },
        { value: "transit", label: "Transit" },
        { value: "medical", label: "Medical" },
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
      key: "assigned_to",
      label: "Consultant",
      type: "async",
      render: (value, onChange) => (
        <ConsultantSelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="Any consultant" />
      ),
    },
    { key: "created", label: "Lead created", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    { key: "next_due", label: "Next due", type: "daterange", fromKey: "next_from", toKey: "next_to" },
    { key: "contacted", label: "Last contacted", type: "daterange", fromKey: "contacted_from", toKey: "contacted_to" },
  ], []);

  const columns = [
    {
      key: "full_name",
      label: "Lead",
      render: (r) => (
        <div>
          <Link to={`/leads`} className="font-medium text-navy hover:underline" onClick={(e) => e.preventDefault()}>
            {r.full_name || "—"}
          </Link>
          <div className="font-mono text-[11px] text-ink-muted">{r.phone || r.email || "—"}</div>
        </div>
      ),
    },
    {
      key: "country_code",
      label: "Country",
      sortable: false,
      render: (r) => <span className="font-mono text-xs uppercase">{r.country_code || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <Stamp tone={STATUS_TONE[r.status] || "muted"} size="sm">{r.status}</Stamp>,
    },
    {
      key: "last_follow_up_outcome",
      label: "Last result",
      sortable: false,
      render: (r) => r.last_follow_up_outcome ? (
        <Stamp tone={OUTCOME_TONE[r.last_follow_up_outcome] || "muted"} size="sm">{r.last_follow_up_outcome}</Stamp>
      ) : "—",
    },
    {
      key: "last_follow_up_at",
      label: "Last contacted",
      render: (r) => <span className="font-mono text-[11px]">{formatDue(r.last_follow_up_at)}</span>,
    },
    {
      key: "next_follow_up_at",
      label: "Next due",
      render: (r) => (
        <span className={cn("font-mono text-[11px]", isOverdue(r.next_follow_up_at) && "text-danger font-semibold")}>
          {formatDue(r.next_follow_up_at)}
        </span>
      ),
    },
    {
      key: "assigned_name",
      label: "Assignee",
      sortable: false,
      render: (r) => <span className="text-xs">{r.assigned_name || "—"}</span>,
    },
    {
      key: "_actions",
      label: "",
      sortable: false,
      className: "text-right",
      render: (r) => (
        <CrmButton variant="solid" size="sm" onClick={() => setFuModal(r)} data-testid={`fu-log-${r.id}`}>
          Log follow-up
        </CrmButton>
      ),
    },
  ];

  const dueValue = list.filters.due || "today";

  return (
    <div className="p-4 space-y-3" data-testid="lead-follow-ups-page">
      <PageHeader
        label="Sales"
        title="Lead follow-ups"
        subtitle="Today, overdue, and results for visa inquiry dialing"
        actions={
          <>
            <CrmButton variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </CrmButton>
            <CrmButton variant="solid" size="sm" onClick={() => setPickLead(true)}>
              <Plus className="w-3.5 h-3.5" /> Add follow-up
            </CrmButton>
            <Link to="/leads">
              <CrmButton variant="outline" size="sm">Leads board</CrmButton>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-surface-card border border-border rounded-[10px] p-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Due today</div>
          <div className="font-mono text-xl font-semibold text-ink">{counts.today}</div>
        </div>
        <div className="bg-surface-card border border-border rounded-[10px] p-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Overdue</div>
          <div className={cn("font-mono text-xl font-semibold", counts.overdue > 0 ? "text-danger" : "text-ink")}>
            {counts.overdue}
          </div>
        </div>
        <div className="bg-surface-card border border-border rounded-[10px] p-3 col-span-2 flex items-center gap-2 text-xs text-ink-muted">
          <PhoneCall className="w-4 h-4 shrink-0" />
          Log a result after every call — next due drives this desk.
        </div>
      </div>

      <Segmented
        value={dueValue}
        onChange={(v) => list.setFilters({ due: v || "today" })}
        segments={[
          { value: "today", label: `Today (${counts.today})` },
          { value: "overdue", label: `Overdue (${counts.overdue})` },
          { value: "upcoming", label: "Upcoming" },
          { value: "all", label: "All open" },
        ]}
        testId="fu-due-presets"
      />

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={() => {
          list.clearFilters();
          list.setFilters({ due: "today" });
        }}
        searchPlaceholder="Search lead name, email, phone…"
        testId="fu-filters"
      />

      <PaginatedTable
        columns={columns}
        data={rows}
        loading={loading}
        empty={{ title: "No leads in this queue", description: "Try another due preset or clear filters." }}
        page={list.page}
        limit={list.limit}
        total={meta.total || 0}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        sortKey={list.sortBy}
        sortDir={list.sortOrder}
        onSortChange={list.setSort}
        serverSort
        testId="fu-table"
      />

      {fuModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-surface-card border border-border rounded-[12px] w-full max-w-lg p-4 shadow-[var(--shadow-premium)]">
            <div className="flex justify-between mb-3">
              <h3 className="text-sm font-semibold">Log follow-up</h3>
              <button type="button" onClick={() => setFuModal(null)}><X className="w-4 h-4" /></button>
            </div>
            <AddLeadFollowUpForm
              lead={fuModal}
              onCancel={() => setFuModal(null)}
              onDone={() => { setFuModal(null); load(); }}
              onNeedsConvert={() => {
                setFuModal(null);
                toast.message("Open Leads board to convert with a visa product");
              }}
            />
          </div>
        </div>
      )}

      {pickLead && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-surface-card border border-border rounded-[12px] w-full max-w-md p-4 space-y-3">
            <div className="flex justify-between">
              <h3 className="text-sm font-semibold">Select lead</h3>
              <button type="button" onClick={() => setPickLead(false)}><X className="w-4 h-4" /></button>
            </div>
            <CrmInput
              placeholder="Search name, email, phone…"
              value={leadSearch}
              onChange={(e) => searchLeads(e.target.value)}
              data-testid="fu-lead-search"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searching && <p className="text-xs text-ink-muted">Searching…</p>}
              {leadHits.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-surface-muted text-sm"
                  onClick={() => { setPickLead(false); setFuModal(l); setLeadHits([]); setLeadSearch(""); }}
                >
                  <div className="font-medium text-ink">{l.full_name}</div>
                  <div className="font-mono text-[11px] text-ink-muted">{l.phone || l.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
