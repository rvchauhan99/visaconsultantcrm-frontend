import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { UserPlus, LayoutGrid, List, RefreshCw, BarChart2, PhoneCall, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmCard } from "@/components/ui/crm-card";
import { CrmField } from "@/components/ui/crm-field";
import { CountrySelect, ConsultantSelect, ProductSelect, PassportProductSelect } from "@/components/forms/selects";
import {
  SERVICE_TYPE_OPTIONS,
  SERVICE_TYPE_LABELS,
  SIMPLE_SERVICE_TYPES,
  emptyServiceDetails,
} from "@/lib/leadServiceSchemas";
import ServiceSectionFields from "@/components/crm/ServiceSectionFields";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Segmented } from "@/components/ui/segmented";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import Stamp from "@/components/Stamp";
import { cn } from "@/lib/utils";
import AddLeadFollowUpForm, { FOLLOW_UP_OUTCOMES } from "@/components/crm/AddLeadFollowUpForm";

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

const STAGE_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};
const ACTIVE_STAGES = ["new", "contacted", "qualified", "converted", "lost"];

const FILTER_KEYS = [
  "status", "source", "country", "from_date", "to_date", "assigned_to",
  "due", "outcome", "visa_type", "service_type", "next_from", "next_to",
];
const LIST_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc" };

const SIMPLE_SERVICE_FILTER = "hotel_booking,ticket,package,travel_insurance,car_booking";

const SERVICE_BOARD_SEGMENTS = [
  { value: "all", label: "All services" },
  { value: "visa", label: "Visa" },
  { value: "passport", label: "Passport" },
  { value: "orders", label: "Orders" },
];

function serviceBoardSegment(serviceTypeFilter) {
  if (!serviceTypeFilter) return "all";
  if (serviceTypeFilter === "visa") return "visa";
  if (serviceTypeFilter === "passport") return "passport";
  if (serviceTypeFilter === SIMPLE_SERVICE_FILTER) return "orders";
  return "";
}

function serviceFilterForSegment(segment) {
  if (segment === "visa") return "visa";
  if (segment === "passport") return "passport";
  if (segment === "orders") return SIMPLE_SERVICE_FILTER;
  return "";
}

function formatDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export default function Leads() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(null);

  // New Features State
  const [viewMode, setViewMode] = useState("board");
  const [selected, setSelected] = useState(new Set());
  const [bulkConsultant, setBulkConsultant] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [dragOverStage, setDragOverStage] = useState("");
  const [fuModal, setFuModal] = useState(null); // { lead, forcedStatus }
  const [convertModal, setConvertModal] = useState(null);
  const [convertProductId, setConvertProductId] = useState(null);
  const [convertPassportProductId, setConvertPassportProductId] = useState(null);
  const [convertOrderDetails, setConvertOrderDetails] = useState({});
  const [drawer, setDrawer] = useState(null); // { lead, follow_ups }

  const load = useCallback(() => {
    setLoading(true);
    const params = { ...list.apiParams };
    if (viewMode === "board") {
      params.limit = 500; // Load more for board view
    }
    api.get("/crm/leads", { params })
      .then((r) => {
        const { items, meta: m } = unwrapListResponse(r.data);
        setLeads(items);
        setMeta(m);
      })
      .catch(() => { toast.error("Could not load leads"); setLeads([]); })
      .finally(() => setLoading(false));
  }, [list.apiParams, viewMode]);

  useEffect(() => { load(); }, [load]);

  const openConvert = (lead) => {
    const sd = lead.service_details || {};
    setConvertProductId(sd.visa_product_id || null);
    setConvertPassportProductId(sd.passport_product_id || null);
    setConvertOrderDetails(sd || emptyServiceDetails(lead.service_type || "visa"));
    setConvertModal(lead);
  };

  const convertLead = async () => {
    if (!convertModal?.id) return;
    const st = convertModal.service_type || "visa";
    const body = { create_case: true, create_order: true };
    if (st === "visa") {
      if (!convertProductId) {
        toast.error("Select a visa product to convert");
        return;
      }
      body.visa_product_id = convertProductId;
    } else if (st === "passport") {
      if (!convertPassportProductId) {
        toast.error("Select a passport product to convert");
        return;
      }
      body.passport_product_id = convertPassportProductId;
      body.create_order = false;
    } else if (SIMPLE_SERVICE_TYPES.has(st)) {
      body.create_case = false;
      body.service_details = convertOrderDetails;
    }
    setConverting(convertModal.id);
    try {
      const r = await api.post(`/crm/leads/${convertModal.id}/convert`, body);
      toast.success("Lead converted");
      setConvertModal(null);
      setFuModal(null);
      if (r.data?.case_id) nav(`/cases/${r.data.case_id}`);
      else if (r.data?.service_order_id) nav("/service-orders");
      else load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Convert failed");
    } finally {
      setConverting(null);
    }
  };

  const openDrawer = async (leadId) => {
    try {
      const r = await api.get(`/crm/leads/${leadId}`);
      setDrawer(r.data);
    } catch {
      toast.error("Could not load lead");
    }
  };

  const bulkReassign = async () => {
    if (!bulkConsultant || selected.size === 0) return;
    setBulkBusy(true);
    let success = 0;
    for (const id of selected) {
      try {
        await api.patch(`/crm/leads/${id}`, { assigned_to: bulkConsultant });
        success++;
      } catch (err) {
        console.error(err);
      }
    }
    toast.success(`Reassigned ${success} leads`);
    setBulkBusy(false);
    setSelected(new Set());
    load();
  };

  // Drag and Drop — requires follow-up modal (no silent status PATCH)
  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOverCol = (e, stage) => {
    e.preventDefault();
    if (dragOverStage !== stage) setDragOverStage(stage);
  };
  const onDropCol = (e, stage) => {
    e.preventDefault();
    setDragOverStage("");
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === stage) return;
    if (lead.status === "converted" || lead.status === "lost") {
      toast.error("Terminal leads cannot be moved");
      return;
    }
    setFuModal({ lead, forcedStatus: stage });
  };

  const byStage = useMemo(() => {
    const map = { new: [], contacted: [], qualified: [], converted: [], lost: [] };
    leads.forEach((l) => {
      const s = l.status || "new";
      if (map[s]) map[s].push(l);
      else map.new.push(l);
    });
    return map;
  }, [leads]);

  const filterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "converted", label: "Converted" },
        { value: "lost", label: "Lost" },
      ],
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
    {
      key: "outcome",
      label: "Last result",
      type: "select",
      options: FOLLOW_UP_OUTCOMES.map((o) => ({ value: o.value, label: o.label })),
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
      key: "service_type",
      label: "Service",
      type: "multiselect",
      options: SERVICE_TYPE_OPTIONS,
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
    { key: "created", label: "Created", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    { key: "next_due", label: "Next due", type: "daterange", fromKey: "next_from", toKey: "next_to" },
  ], []);

  const columns = [
    {
      key: "full_name",
      label: "Name",
      render: (row) => (
        <button type="button" className="font-medium text-navy hover:underline text-left" onClick={() => openDrawer(row.id)}>
          {row.full_name || row.name || "—"}
        </button>
      ),
    },
    { key: "email", label: "Email", render: (row) => <span className="font-mono text-xs">{row.email || "—"}</span> },
    { key: "phone", label: "Phone", render: (row) => <span className="font-mono text-xs">{row.phone || "—"}</span> },
    { key: "source", label: "Source", render: (row) => <span className="text-xs capitalize">{row.source || "—"}</span> },
    {
      key: "service_type",
      label: "Service",
      sortable: false,
      render: (row) => (
        <Stamp tone="teal" size="sm">
          {SERVICE_TYPE_LABELS[row.service_type] || row.service_type || "Visa"}
        </Stamp>
      ),
    },
    {
      key: "country_code",
      label: "Country",
      sortable: false,
      render: (row) => <span className="font-mono text-xs uppercase">{row.country_code || "—"}</span>,
    },
    {
      key: "last_follow_up_outcome",
      label: "Result",
      sortable: false,
      render: (row) => row.last_follow_up_outcome ? (
        <Stamp tone={OUTCOME_TONE[row.last_follow_up_outcome] || "muted"} size="sm">
          {row.last_follow_up_outcome}
        </Stamp>
      ) : "—",
    },
    {
      key: "next_follow_up_at",
      label: "Next due",
      render: (row) => (
        <span className={cn("font-mono text-[11px]", isOverdue(row.next_follow_up_at) && "text-danger")}>
          {formatDue(row.next_follow_up_at) || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Stamp tone={STATUS_TONE[row.status] || "muted"} size="sm">
          {row.status || "new"}
        </Stamp>
      ),
    },
    {
      key: "_actions",
      label: "",
      sortable: false,
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <CrmButton variant="ghost" size="sm" onClick={() => setFuModal({ lead: row, forcedStatus: null })}>
            Log FU
          </CrmButton>
          {row.status !== "converted" ? (
            <CrmButton
              variant="outline"
              size="sm"
              loading={converting === row.id}
              onClick={() => openConvert(row)}
              data-testid={`lead-convert-${row.id}`}
            >
              Convert
            </CrmButton>
          ) : null}
        </div>
      ),
    },
  ];

  const bulkActions = (
    <>
      <div className="w-52">
        <ConsultantSelect
          value={bulkConsultant || null}
          onChange={(v) => setBulkConsultant(v || "")}
          placeholder="Reassign to…"
        />
      </div>
      <CrmButton variant="solid" size="sm" disabled={!bulkConsultant} loading={bulkBusy} onClick={bulkReassign}>
        Bulk reassign
      </CrmButton>
      <CrmButton variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</CrmButton>
    </>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] p-4 overflow-hidden">
      <PageHeader
        label="Sales"
        title="Leads"
        subtitle="Capture inquiries — drag status requires a follow-up result"
        actions={
          <>
            <CrmButton variant="outline" size="sm" onClick={() => nav("/follow-ups")}>
              <PhoneCall className="w-3.5 h-3.5" /> Follow-ups desk
            </CrmButton>
            <div className="flex p-1 rounded-full bg-surface-muted/50 border border-border backdrop-blur-sm gap-1">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={cn("relative px-3 py-1.5 rounded-full transition-colors", viewMode === "board" ? "text-white" : "text-ink-muted hover:text-ink hover:bg-surface-card/50")}
              >
                {viewMode === "board" && <motion.div layoutId="leadsViewMode" className="absolute inset-0 bg-navy rounded-full shadow-[0_2px_8px_rgba(15,40,32,0.25)]" initial={false} transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                <LayoutGrid className="w-4 h-4 relative z-10" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn("relative px-3 py-1.5 rounded-full transition-colors", viewMode === "list" ? "text-white" : "text-ink-muted hover:text-ink hover:bg-surface-card/50")}
              >
                {viewMode === "list" && <motion.div layoutId="leadsViewMode" className="absolute inset-0 bg-navy rounded-full shadow-[0_2px_8px_rgba(15,40,32,0.25)]" initial={false} transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                <List className="w-4 h-4 relative z-10" />
              </button>
            </div>
            <CrmButton
              variant="outline"
              size="sm"
              onClick={() => nav({ pathname: "/leads/analysis", search: searchParams.toString() })}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Analysis
            </CrmButton>
            <CrmButton variant="outline" size="sm" onClick={load} className="rounded-full shadow-sm hover:shadow-glow-navy transition-shadow">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </CrmButton>
            <CrmButton variant="solid" size="sm" onClick={() => nav("/leads/new")} data-testid="lead-new-btn" className="rounded-full shadow-glow-navy">
              <UserPlus className="w-3.5 h-3.5" />
              New lead
            </CrmButton>
          </>
        }
      />

      <div className="flex-shrink-0">
        <FilterPanel
          fields={filterFields}
          values={list.filters}
          q={list.q}
          activeCount={list.activeFilterCount}
          onQChange={list.setQ}
          onApply={list.setFilters}
          onClear={list.clearFilters}
          searchPlaceholder="Search name, email, phone…"
          testId="leads-filters"
          className="mb-3"
        />

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segmented
            value={list.filters.due || ""}
            onChange={(v) => list.setFilters({ due: v })}
            segments={[
              { value: "", label: "All dues" },
              { value: "today", label: "Today" },
              { value: "overdue", label: "Overdue" },
              { value: "upcoming", label: "Upcoming" },
            ]}
            testId="leads-due-presets"
          />
          {viewMode === "board" && (
            <Segmented
              value={serviceBoardSegment(list.filters.service_type || "")}
              onChange={(v) => list.setFilters({ service_type: serviceFilterForSegment(v) })}
              segments={SERVICE_BOARD_SEGMENTS}
              testId="leads-service-type"
            />
          )}
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="flex-1 overflow-auto bg-surface-card rounded-lg border border-border">
          <PaginatedTable
            columns={columns}
            data={leads}
            loading={loading}
            empty={{ title: "No leads yet", description: "Create a lead to start tracking inquiries." }}
            page={list.page}
            limit={list.limit}
            total={meta.total || 0}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
            sortKey={list.sortBy}
            sortDir={list.sortOrder}
            onSortChange={list.setSort}
            serverSort
            rowTestId={(row) => `lead-row-${row.id}`}
            testId="leads-table"
            selectable={true}
            selectedIds={selected}
            onSelectionChange={setSelected}
            bulkActions={bulkActions}
          />
        </div>
      ) : loading ? (
        <div className="flex gap-4 min-w-max flex-1 overflow-hidden px-1">
          {ACTIVE_STAGES.map((s) => (
            <div key={s} className="kanban-col w-[320px] h-full rounded-2xl bg-gradient-to-b from-surface-muted/50 to-surface-card/30 animate-[shimmer_1.6s_linear_infinite] border border-border/40" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 min-w-max flex-1 overflow-x-auto overflow-y-hidden pb-4 pt-1 px-1" data-testid="leads-board">
          {ACTIVE_STAGES.map((s) => (
            <div
              key={s}
              className={cn(
                "kanban-col w-[320px] h-full rounded-2xl flex flex-col shrink-0 transition-colors duration-200",
                "bg-gradient-to-b from-surface-warm/40 to-surface-card/20 backdrop-blur-md border border-border/60 shadow-sm",
                dragOverStage === s && "border-navy/40 bg-navy/5 shadow-glow-navy"
              )}
              onDragOver={(e) => onDragOverCol(e, s)}
              onDragLeave={() => setDragOverStage((cur) => (cur === s ? "" : cur))}
              onDrop={(e) => onDropCol(e, s)}
            >
              <div className="px-4 py-3.5 border-b border-border/50 flex items-center justify-between bg-surface-card/40 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full shadow-sm", {
                    "bg-ink-muted": s === "new",
                    "bg-warning": s === "contacted",
                    "bg-teal": s === "qualified",
                    "bg-gold-light": s === "converted",
                    "bg-danger": s === "lost",
                  })} />
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                    {STAGE_LABELS[s]}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full shadow-sm bg-surface text-ink-muted border border-border/50">
                  {byStage[s].length}
                </span>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {byStage[s].map((l) => (
                    <LeadCard
                      key={l.id}
                      lead={l}
                      onDragStart={onDragStart}
                      selected={selected.has(l.id)}
                      onToggleSelect={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(l.id)) next.delete(l.id);
                          else next.add(l.id);
                          return next;
                        });
                      }}
                      onConvert={() => openConvert(l)}
                      onOpen={() => openDrawer(l.id)}
                      onLogFu={() => setFuModal({ lead: l, forcedStatus: null })}
                    />
                  ))}
                </AnimatePresence>
                {byStage[s].length === 0 && dragOverStage === s && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-20 rounded-xl border-2 border-dashed border-navy/40 bg-navy/5 flex items-center justify-center text-xs font-medium text-navy/70"
                  >
                    Drop lead here
                  </motion.div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "board" && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-3 bg-surface-card border border-navy/30 rounded-[10px] p-3 shadow-[var(--shadow-premium)]" data-testid="leads-bulk-bar">
          <span className="text-xs font-medium text-ink">{selected.size} selected</span>
          {bulkActions}
        </div>
      )}

      {/* Follow-up modal (board drag / log) */}
      {fuModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" data-testid="lead-fu-modal">
          <div className="bg-surface-card border border-border rounded-[12px] shadow-[var(--shadow-premium)] w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink">Log follow-up</h3>
              <button type="button" onClick={() => setFuModal(null)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <AddLeadFollowUpForm
              lead={fuModal.lead}
              forcedStatus={fuModal.forcedStatus}
              onCancel={() => setFuModal(null)}
              onDone={() => { setFuModal(null); load(); if (drawer?.lead?.id === fuModal.lead.id) openDrawer(fuModal.lead.id); }}
              onNeedsConvert={(lead) => { setFuModal(null); openConvert(lead); }}
            />
          </div>
        </div>
      )}

      {/* Convert with product */}
      {convertModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" data-testid="lead-convert-modal">
          <div className="bg-surface-card border border-border rounded-[12px] shadow-[var(--shadow-premium)] w-full max-w-lg p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                Convert {convertModal.full_name}
                <span className="ml-2 text-ink-muted font-normal">
                  ({SERVICE_TYPE_LABELS[convertModal.service_type] || convertModal.service_type || "Visa"})
                </span>
              </h3>
              <button type="button" onClick={() => setConvertModal(null)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            {(convertModal.service_type || "visa") === "visa" && (
              <CrmField label="Visa product" required>
                <ProductSelect
                  value={convertProductId}
                  onChange={(v) => setConvertProductId(v)}
                  placeholder="Select product…"
                  testId="lead-convert-product"
                />
              </CrmField>
            )}
            {convertModal.service_type === "passport" && (
              <CrmField label="Passport product" required>
                <PassportProductSelect
                  value={convertPassportProductId}
                  onChange={(v) => setConvertPassportProductId(v)}
                  placeholder="Select passport product…"
                  testId="lead-convert-passport-product"
                />
              </CrmField>
            )}
            {!SIMPLE_SERVICE_TYPES.has(convertModal.service_type) && (
              <p className="text-[11px] text-ink-muted rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
                Creates <strong>one case</strong> for the contact person as traveler by default.
                Additional family travelers should be stored as traveler profiles under the same contact.
              </p>
            )}
            {SIMPLE_SERVICE_TYPES.has(convertModal.service_type) && (
              <ServiceSectionFields
                serviceType={convertModal.service_type}
                details={convertOrderDetails}
                onChange={setConvertOrderDetails}
              />
            )}
            <div className="flex justify-end gap-2">
              <CrmButton variant="outline" size="sm" onClick={() => setConvertModal(null)}>Cancel</CrmButton>
              <CrmButton variant="solid" size="sm" loading={!!converting} onClick={convertLead} data-testid="lead-convert-confirm">
                {SIMPLE_SERVICE_TYPES.has(convertModal.service_type) ? "Convert to order" : "Convert to case"}
              </CrmButton>
            </div>
          </div>
        </div>
      )}

      {/* Lead drawer */}
      {drawer?.lead && (
        <div className="fixed inset-0 z-30 flex justify-end bg-ink/30" data-testid="lead-drawer">
          <button type="button" className="flex-1" aria-label="Close" onClick={() => setDrawer(null)} />
          <aside className="w-full max-w-md h-full bg-surface-card border-l border-border shadow-[var(--shadow-premium)] p-4 overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-ink-muted font-mono">Lead</div>
                <h3 className="text-lg font-semibold text-ink">{drawer.lead.full_name}</h3>
                <div className="text-xs text-ink-muted font-mono">{drawer.lead.email} · {drawer.lead.phone || "—"}</div>
              </div>
              <button type="button" onClick={() => setDrawer(null)}><X className="w-4 h-4 text-ink-muted" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Stamp tone={STATUS_TONE[drawer.lead.status] || "muted"} size="sm">{drawer.lead.status}</Stamp>
              <Stamp tone="teal" size="sm">
                {SERVICE_TYPE_LABELS[drawer.lead.service_type] || drawer.lead.service_type || "Visa"}
              </Stamp>
              {drawer.lead.last_follow_up_outcome && (
                <Stamp tone={OUTCOME_TONE[drawer.lead.last_follow_up_outcome] || "muted"} size="sm">
                  {drawer.lead.last_follow_up_outcome}
                </Stamp>
              )}
              {drawer.lead.next_follow_up_at && (
                <span className={cn("text-[11px] font-mono", isOverdue(drawer.lead.next_follow_up_at) && "text-danger")}>
                  Next: {formatDue(drawer.lead.next_follow_up_at)}
                </span>
              )}
            </div>
            {(drawer.sibling_leads || []).length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-widest text-ink-muted font-mono mb-2">Same submission</div>
                <div className="flex flex-wrap gap-1">
                  {drawer.sibling_leads.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="text-xs px-2 py-1 rounded border border-border hover:border-navy/40"
                      onClick={() => openDrawer(s.id)}
                    >
                      {SERVICE_TYPE_LABELS[s.service_type] || s.service_type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <CrmButton variant="outline" size="sm" onClick={() => setFuModal({ lead: drawer.lead, forcedStatus: null })}>
                Log follow-up
              </CrmButton>
              {drawer.lead.status !== "converted" && (
                <CrmButton variant="solid" size="sm" onClick={() => openConvert(drawer.lead)}>Convert</CrmButton>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted font-mono mb-2">Follow-up history</div>
            <div className="space-y-2">
              {(drawer.follow_ups || []).length === 0 && (
                <p className="text-xs text-ink-muted">No follow-ups yet.</p>
              )}
              {(drawer.follow_ups || []).map((fu) => (
                <div key={fu.id} className="border border-border rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <Stamp tone={OUTCOME_TONE[fu.outcome] || "muted"} size="sm">{fu.outcome}</Stamp>
                    <span className="font-mono text-ink-muted">{formatDue(fu.contacted_at)}</span>
                  </div>
                  <div className="text-ink-muted capitalize">{fu.channel}</div>
                  {fu.notes ? <p className="mt-1 text-ink">{fu.notes}</p> : null}
                  {fu.next_follow_up_at ? (
                    <div className="mt-1 font-mono text-[10px] text-ink-muted">Next: {formatDue(fu.next_follow_up_at)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, onDragStart, selected, onToggleSelect, onConvert, onOpen, onLogFu }) {
  return (
    <motion.div
      layout
      layoutId={lead.id}
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="cursor-grab active:cursor-grabbing relative group"
    >
      <label
        className="absolute top-3 right-3 z-20 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-border text-navy focus:ring-navy/50 bg-surface/50 shadow-sm transition-all"
        />
      </label>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
        className={cn(
          "block bg-surface border border-border/80 rounded-xl p-3.5 text-left w-full",
          "relative overflow-hidden",
          selected ? "ring-2 ring-navy/50 border-navy/50 bg-navy/5 shadow-glow-navy" : "hover:border-navy/30 hover:shadow-glow-navy",
          "transition-all duration-200"
        )}
      >
        <div className="flex items-center gap-2 text-xs mb-1.5 pr-6">
          <span className="font-semibold text-ink truncate flex-1">{lead.full_name || "—"}</span>
        </div>

        <div className="flex flex-col gap-1 mb-2 text-xs text-ink-muted">
          <span className="truncate">{lead.email}</span>
          <span>{lead.phone}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <Stamp tone="teal" size="sm">
            {SERVICE_TYPE_LABELS[lead.service_type] || lead.service_type || "Visa"}
          </Stamp>
          {lead.last_follow_up_outcome && (
            <Stamp tone={OUTCOME_TONE[lead.last_follow_up_outcome] || "muted"} size="sm">
              {lead.last_follow_up_outcome}
            </Stamp>
          )}
          {lead.next_follow_up_at && (
            <span className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/50",
              isOverdue(lead.next_follow_up_at) ? "text-danger bg-danger/10" : "text-ink-muted bg-surface-muted",
            )}>
              {formatDue(lead.next_follow_up_at)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto border-t border-border/50 pt-2">
          <span className="text-[10px] text-ink-subtle uppercase tracking-widest bg-surface-muted px-1.5 py-0.5 rounded border border-border/50">
            {lead.source}
          </span>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <CrmButton variant="ghost" size="xs" onClick={onLogFu} className="h-6 text-[10px]">FU</CrmButton>
            {lead.status !== "converted" && (
              <CrmButton variant="ghost" size="xs" onClick={onConvert} className="h-6 text-[10px]">
                Convert
              </CrmButton>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
