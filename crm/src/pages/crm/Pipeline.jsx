import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Segmented } from "@/components/ui/segmented";
import { MeterBar } from "@/components/ui/meter-bar";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { RefreshCw, LayoutGrid, List, AlertTriangle } from "lucide-react";
import { cn, formatCaseNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVE_STAGES = ["new", "docs_pending", "ready_to_submit", "submitted", "decision"];
const STAGE_LABELS = {
  new: "New",
  docs_pending: "Docs pending",
  ready_to_submit: "Ready",
  submitted: "Submitted",
  decision: "Decision",
  closed: "Closed",
};
const slaStamp = {
  on_track: "success", due_soon: "warning", overdue: "danger", completed: "muted",
};

const FILTER_KEYS = [
  "country", "consultant_id", "stage", "source", "sla",
  "payment_status", "on_hold", "unassigned", "from_date", "to_date", "case_type",
];
const LIST_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc", case_type: "visa" };
const BOARD_PAGE_SIZE = 50;

function emptyBoardState() {
  return Object.fromEntries(
    ACTIVE_STAGES.map((s) => [s, { items: [], page: 1, has_more: false, loadingMore: false }]),
  );
}

export default function Pipeline() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [viewMode, setViewMode] = useState("board");
  const [cases, setCases] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [bulkConsultant, setBulkConsultant] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAvailable, setBulkAvailable] = useState(true);
  const [boardByStage, setBoardByStage] = useState(emptyBoardState);

  const filterParams = useMemo(() => {
    const p = { ...list.apiParams };
    delete p.page;
    delete p.limit;
    delete p.stage;
    return p;
  }, [list.apiParams]);

  const load = useCallback(() => {
    setLoading(true);
    if (viewMode === "list") {
      const params = {
        ...list.apiParams,
        stage_group: "active",
        include_summary: true,
        include_docs: true,
      };
      api.get("/crm/cases", { params })
        .then((r) => {
          const { items, meta: m, summary: s } = unwrapListResponse(r.data);
          setCases(items);
          setMeta(m);
          setSummary(s);
          setSelected(new Set());
        })
        .catch(() => toast.error("Failed to load pipeline"))
        .finally(() => setLoading(false));
      return;
    }

    // Board: summary + per-stage pages (no silent 500 cut)
    const stagesToLoad = list.filters.stage
      ? list.filters.stage.split(",").map((s) => s.trim()).filter((s) => ACTIVE_STAGES.includes(s))
      : ACTIVE_STAGES;

    const summaryReq = api.get("/crm/cases", {
      params: {
        ...filterParams,
        stage_group: "active",
        page: 1,
        limit: 1,
        include_summary: true,
        include_docs: false,
      },
    });

    const stageReqs = stagesToLoad.map((stage) =>
      api.get("/crm/cases", {
        params: {
          ...filterParams,
          stage_group: "active",
          stage,
          page: 1,
          limit: BOARD_PAGE_SIZE,
          include_summary: false,
          include_docs: false,
        },
      }),
    );

    Promise.all([summaryReq, ...stageReqs])
      .then(([sumRes, ...stageRes]) => {
        const { summary: s } = unwrapListResponse(sumRes.data);
        setSummary(s);
        const next = emptyBoardState();
        let flat = [];
        stagesToLoad.forEach((stage, i) => {
          const { items, meta: m } = unwrapListResponse(stageRes[i].data);
          next[stage] = {
            items,
            page: 1,
            has_more: !!m.has_more,
            loadingMore: false,
          };
          flat = flat.concat(items);
        });
        setBoardByStage(next);
        setCases(flat);
        const totalOpen = ACTIVE_STAGES.reduce((a, st) => a + ((s?.by_stage || {})[st] || 0), 0);
        setMeta({ page: 1, limit: BOARD_PAGE_SIZE, total: totalOpen || flat.length, pages: 1 });
        setSelected(new Set());
      })
      .catch(() => toast.error("Failed to load pipeline"))
      .finally(() => setLoading(false));
  }, [list.apiParams, list.filters.stage, filterParams, viewMode]);

  useEffect(() => { load(); }, [load]);

  const loadMoreStage = useCallback((stage) => {
    setBoardByStage((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], loadingMore: true },
    }));
    const cur = boardByStage[stage];
    const nextPage = (cur?.page || 1) + 1;
    api.get("/crm/cases", {
      params: {
        ...filterParams,
        stage_group: "active",
        stage,
        page: nextPage,
        limit: BOARD_PAGE_SIZE,
        include_summary: false,
        include_docs: false,
      },
    })
      .then((r) => {
        const { items, meta: m } = unwrapListResponse(r.data);
        setBoardByStage((prev) => {
          const merged = [...(prev[stage]?.items || []), ...items];
          return {
            ...prev,
            [stage]: {
              items: merged,
              page: nextPage,
              has_more: !!m.has_more,
              loadingMore: false,
            },
          };
        });
        setCases((prev) => {
          const ids = new Set(prev.map((c) => c.id));
          return prev.concat(items.filter((c) => !ids.has(c.id)));
        });
      })
      .catch(() => {
        toast.error(`Failed to load more ${STAGE_LABELS[stage] || stage}`);
        setBoardByStage((prev) => ({
          ...prev,
          [stage]: { ...prev[stage], loadingMore: false },
        }));
      });
  }, [boardByStage, filterParams]);

  const byStage = useMemo(() => {
    if (viewMode === "board") {
      return Object.fromEntries(ACTIVE_STAGES.map((s) => [s, boardByStage[s]?.items || []]));
    }
    const m = Object.fromEntries(ACTIVE_STAGES.map((s) => [s, []]));
    cases.forEach((c) => m[c.stage]?.push(c));
    return m;
  }, [viewMode, boardByStage, cases]);

  const stageCounts = summary?.by_stage || {};
  const stageTotal = ACTIVE_STAGES.reduce((a, s) => a + (stageCounts[s] || 0), 0);
  const boardTruncated = viewMode === "board" && ACTIVE_STAGES.some(
    (s) => (boardByStage[s]?.items?.length || 0) < (stageCounts[s] || 0) || boardByStage[s]?.has_more,
  );

  const filterFields = useMemo(() => [
    {
      key: "country",
      label: "Country",
      type: "async",
      render: (value, onChange) => (
        <CountrySelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All countries" testId="pipeline-filter-country" />
      ),
    },
    {
      key: "consultant_id",
      label: "Consultant",
      type: "async",
      render: (value, onChange) => (
        <ConsultantSelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="All consultants" testId="pipeline-filter-consultant" />
      ),
    },
    {
      key: "stage",
      label: "Stage",
      type: "multiselect",
      options: ACTIVE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
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
      ],
    },
    {
      key: "payment_status",
      label: "Payment",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "paid", label: "Paid" },
      ],
    },
    { key: "on_hold", label: "On hold", type: "checkbox", placeholder: "On hold only" },
    { key: "unassigned", label: "Unassigned", type: "checkbox", placeholder: "Unassigned only" },
    { key: "created", label: "Created", type: "daterange", fromKey: "from_date", toKey: "to_date" },
  ], []);

  const moveCard = async (caseId, targetStage) => {
    const prevCases = cases;
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1 || cases[idx].stage === targetStage) return;
    setCases((cs) => cs.map((c) => (c.id === caseId ? { ...c, stage: targetStage } : c)));
    try {
      await api.patch(`/crm/cases/${caseId}/stage`, { target_stage: targetStage });
      toast.success(`Moved to ${STAGE_LABELS[targetStage]}`);
      load();
    } catch (e) {
      setCases(prevCases);
      toast.error(e.response?.data?.detail || "Move failed");
    }
  };

  const onDragStart = (e, caseId) => {
    e.dataTransfer.setData("text/case-id", caseId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOverCol = (e, stage) => { e.preventDefault(); setDragOverStage(stage); };
  const onDropCol = (e, stage) => {
    e.preventDefault();
    setDragOverStage("");
    const id = e.dataTransfer.getData("text/case-id");
    if (id) moveCard(id, stage);
  };

  const bulkReassign = async () => {
    if (!bulkConsultant || selected.size === 0 || !bulkAvailable) return;
    setBulkBusy(true);
    try {
      await api.post("/crm/cases/bulk", {
        case_ids: Array.from(selected),
        action: "reassign",
        consultant_id: bulkConsultant,
      });
      toast.success(`Reassigned ${selected.size} case(s)`);
      setSelected(new Set());
      setBulkConsultant("");
      load();
    } catch (e) {
      if (e.response?.status === 404) setBulkAvailable(false);
      else toast.error(e.response?.data?.detail || "Bulk reassign failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const listColumns = [
    {
      key: "customer",
      label: "Customer",
      sortable: false,
      render: (c) => (
        <div>
          <Link to={`/cases/${c.id}`} className="text-navy hover:underline text-xs font-medium" onClick={(e) => e.stopPropagation()}>
            {c.customer?.full_name || "—"}
          </Link>
          <div className="text-[10px] font-mono text-ink-muted">{formatCaseNumber(c)}</div>
        </div>
      ),
    },
    {
      key: "country",
      label: "Country",
      sortable: false,
      render: (c) => (
        <span className="inline-flex items-center gap-1">
          <span>{c.config_snapshot_json?.country_flag}</span>
          <span className="text-xs">{c.config_snapshot_json?.country_code}</span>
        </span>
      ),
    },
    {
      key: "stage",
      label: "Stage",
      render: (c) => <Stamp tone="muted" size="sm">{STAGE_LABELS[c.stage] || c.stage}</Stamp>,
    },
    {
      key: "docs_progress",
      label: "Docs",
      sortable: false,
      render: (c) => (
        <div className="w-24">
          <MeterBar
            value={c.docs_verified || 0}
            max={c.docs_required || 1}
            tone={(c.docs_progress || 0) >= 100 ? "success" : (c.docs_progress || 0) >= 50 ? "teal" : "warning"}
            height="h-1"
            showLabel
            label={`${c.docs_verified || 0}/${c.docs_required || 0}`}
          />
        </div>
      ),
    },
    { key: "source", label: "Source", render: (c) => <span className="capitalize">{c.source}</span> },
    {
      key: "sla_due_date",
      label: "SLA",
      render: (c) => <Stamp tone={slaStamp[c.sla_status] || "muted"} size="sm">{c.sla_status?.replace("_", " ") || "—"}</Stamp>,
    },
    {
      key: "assigned_consultant",
      label: "Assignee",
      sortable: false,
      render: (c) => <span className="text-xs">{c.assigned_consultant?.full_name || "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] p-4 overflow-hidden">
      <PageHeader
        label="Cases"
        title="Active pipeline"
        subtitle="Running cases — closed archive is under Closed cases"
        actions={
          <>
            <span className="text-xs font-mono text-ink-muted">{meta.total ?? cases.length} cases</span>
            <div className="flex p-1 rounded-full bg-surface-muted/50 border border-border backdrop-blur-sm gap-1">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={cn("relative px-3 py-1.5 rounded-full transition-colors", viewMode === "board" ? "text-white" : "text-ink-muted hover:text-ink hover:bg-surface-card/50")}
                data-testid="pipeline-view-board"
                title="Board"
              >
                {viewMode === "board" && <motion.div layoutId="pipelineViewMode" className="absolute inset-0 bg-navy rounded-full shadow-[0_2px_8px_rgba(15,40,32,0.25)]" initial={false} transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                <LayoutGrid className="w-4 h-4 relative z-10" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn("relative px-3 py-1.5 rounded-full transition-colors", viewMode === "list" ? "text-white" : "text-ink-muted hover:text-ink hover:bg-surface-card/50")}
                data-testid="pipeline-view-list"
                title="List"
              >
                {viewMode === "list" && <motion.div layoutId="pipelineViewMode" className="absolute inset-0 bg-navy rounded-full shadow-[0_2px_8px_rgba(15,40,32,0.25)]" initial={false} transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                <List className="w-4 h-4 relative z-10" />
              </button>
            </div>
            <CrmButton variant="outline" size="sm" onClick={load} data-testid="pipeline-refresh" className="rounded-full shadow-sm hover:shadow-glow-navy transition-shadow">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </CrmButton>
          </>
        }
      />

      <div className="flex items-start gap-4 mb-3">
        <div className="flex-1">
          <FilterPanel
            fields={filterFields}
            values={list.filters}
            q={list.q}
            activeCount={list.activeFilterCount}
            onQChange={list.setQ}
            onApply={list.setFilters}
            onClear={list.clearFilters}
            searchPlaceholder="Search case #, customer, country…"
            testId="pipeline-filters"
            className="mb-0" // Remove bottom margin when inline
          />
        </div>
        <div className="flex-shrink-0 pt-0.5 space-y-2">
          <Segmented
            value={list.filters.case_type || "visa"}
            onChange={(v) => list.setFilters({ case_type: v || "visa" })}
            segments={[
              { value: "visa", label: "Visa" },
              { value: "passport", label: "Passport" },
            ]}
            testId="pipeline-case-type"
          />
          <Segmented
            value={list.filters.stage || ""}
            onChange={(v) => list.setFilters({ stage: v === list.filters.stage ? "" : v })}
            segments={[
              { value: "", label: "All", count: stageTotal || meta.total || 0 },
              ...ACTIVE_STAGES.map((s) => ({
                value: s,
                label: STAGE_LABELS[s],
                count: stageCounts[s] || 0,
              })),
            ]}
            testId="pipeline-stage-pills"
          />
        </div>
      </div>

      {viewMode === "list" && stageTotal > 0 && (
        <div className="mb-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          {ACTIVE_STAGES.map((s) => {
            const count = stageCounts[s] || 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => list.setFilters({ stage: list.filters.stage === s ? "" : s })}
                className="text-left bg-surface-card border border-border rounded-lg px-2.5 py-2 hover:border-navy/30"
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="uppercase font-mono tracking-wider text-ink-muted">{STAGE_LABELS[s]}</span>
                  <span className="font-mono text-ink">{count}</span>
                </div>
                <MeterBar value={count} max={stageTotal || 1} height="h-1" tone="navy" />
              </button>
            );
          })}
        </div>
      )}

      {boardTruncated && viewMode === "board" && (
        <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-ink" data-testid="pipeline-board-cap">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
          Some columns show a page of cases — use Load more in each column, or switch to list view for full pagination.
          <CrmButton variant="outline" size="xs" onClick={() => setViewMode("list")}>List view</CrmButton>
        </div>
      )}

      {viewMode === "list" ? (
        <div className="flex-1 overflow-auto bg-surface-card rounded-lg border border-border">
          <PaginatedTable
            columns={listColumns}
            data={cases}
            loading={loading}
            empty={{ title: "No active cases match filters" }}
            page={list.page}
            limit={list.limit}
            total={meta.total || 0}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
            sortKey={list.sortBy}
            sortDir={list.sortOrder}
            onSortChange={list.setSort}
            serverSort
            selectable={bulkAvailable}
            selectedIds={selected}
            onSelectionChange={setSelected}
            bulkActions={
              <>
                <div className="w-52">
                  <ConsultantSelect
                    value={bulkConsultant || null}
                    onChange={(v) => setBulkConsultant(v || "")}
                    placeholder="Reassign to…"
                    testId="pipeline-bulk-consultant"
                  />
                </div>
                <CrmButton variant="solid" size="sm" disabled={!bulkConsultant} loading={bulkBusy} onClick={bulkReassign} data-testid="pipeline-bulk-reassign">
                  Bulk reassign
                </CrmButton>
                <CrmButton variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</CrmButton>
              </>
            }
            testId="pipeline-list"
          />
        </div>
      ) : loading ? (
        <div className="flex gap-4 min-w-max flex-1 overflow-hidden px-1">
          {ACTIVE_STAGES.map((s) => (
            <div key={s} className="kanban-col w-[320px] h-full rounded-2xl bg-gradient-to-b from-surface-muted/50 to-surface-card/30 animate-[shimmer_1.6s_linear_infinite] border border-border/40" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 min-w-max flex-1 overflow-x-auto overflow-y-hidden pb-4 pt-1 px-1" data-testid="pipeline-board">
          {ACTIVE_STAGES.map((s) => (
            <div
              key={s}
              className={cn(
                "kanban-col w-[320px] h-full rounded-2xl flex flex-col shrink-0 transition-colors duration-200",
                "bg-gradient-to-b from-surface-warm/40 to-surface-card/20 backdrop-blur-md border border-border/60 shadow-sm",
                dragOverStage === s && "border-navy/40 bg-navy/5 shadow-glow-navy"
              )}
              data-testid={`pipeline-col-${s}`}
              onDragOver={(e) => onDragOverCol(e, s)}
              onDragLeave={() => setDragOverStage((cur) => (cur === s ? "" : cur))}
              onDrop={(e) => onDropCol(e, s)}
            >
              <div className="px-4 py-3.5 border-b border-border/50 flex items-center justify-between bg-surface-card/40 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full shadow-sm", {
                    "bg-ink-muted": s === "new",
                    "bg-warning": s === "docs_pending",
                    "bg-teal": s === "ready_to_submit",
                    "bg-navy": s === "submitted",
                    "bg-gold-light": s === "decision",
                  })} />
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                    {STAGE_LABELS[s]}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-mono font-medium px-2 py-0.5 rounded-full shadow-sm transition-colors",
                    (stageCounts[s] || byStage[s].length) > 0 ? "bg-navy text-white" : "bg-surface text-ink-muted border border-border/50",
                  )}
                  data-testid={`pipeline-col-count-${s}`}
                >
                  {stageCounts[s] ?? byStage[s].length}
                </span>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-3 min-h-[150px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {byStage[s].map((c) => (
                    <PipelineCard
                      key={c.id}
                      c={c}
                      onDragStart={onDragStart}
                      selected={selected.has(c.id)}
                      onToggleSelect={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        });
                      }}
                      showSelect={bulkAvailable}
                    />
                  ))}
                </AnimatePresence>
                {byStage[s].length === 0 && dragOverStage === s && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-20 rounded-xl border-2 border-dashed border-navy/40 bg-navy/5 flex items-center justify-center text-xs font-medium text-navy/70"
                  >
                    Drop case here
                  </motion.div>
                )}
                {(boardByStage[s]?.has_more || (byStage[s].length < (stageCounts[s] || 0))) && (
                  <CrmButton
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-border/50 text-ink-muted hover:text-ink hover:border-border mt-2 shadow-sm bg-surface/50"
                    loading={boardByStage[s]?.loadingMore}
                    onClick={() => loadMoreStage(s)}
                    data-testid={`pipeline-load-more-${s}`}
                  >
                    Load more ({byStage[s].length}/{stageCounts[s] || byStage[s].length})
                  </CrmButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "board" && bulkAvailable && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-3 bg-surface-card border border-navy/30 rounded-[10px] p-3 shadow-[var(--shadow-premium)]" data-testid="pipeline-bulk-bar">
          <span className="text-xs font-medium text-ink">{selected.size} selected</span>
          <div className="w-52">
            <ConsultantSelect
              value={bulkConsultant || null}
              onChange={(v) => setBulkConsultant(v || "")}
              placeholder="Reassign to…"
              testId="pipeline-bulk-consultant-board"
            />
          </div>
          <CrmButton variant="solid" size="sm" disabled={!bulkConsultant} loading={bulkBusy} onClick={bulkReassign}>
            Bulk reassign
          </CrmButton>
          <CrmButton variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</CrmButton>
        </div>
      )}
    </div>
  );
}

function PipelineCard({ c, onDragStart, selected, onToggleSelect, showSelect }) {
  const sla = slaStamp[c.sla_status] || "muted";
  
  const slaStyles = {
    success: "bg-teal/5 text-teal border-teal/20",
    warning: "bg-warning/10 text-warning-dark border-warning/30",
    danger: "bg-danger/10 text-danger border-danger/20",
    muted: "bg-surface-muted text-ink-muted border-border",
  }[sla];

  const slaBorder = {
    success: "border-teal",
    warning: "border-warning",
    danger: "border-danger",
    muted: "border-transparent",
  }[sla];

  return (
    <motion.div
      layout
      layoutId={c.id}
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      draggable
      onDragStart={(e) => onDragStart(e, c.id)}
      className="cursor-grab active:cursor-grabbing relative group"
    >
      {showSelect && (
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
            data-testid={`pipeline-card-select-${c.id.slice(0, 8)}`}
          />
        </label>
      )}
      <Link
        to={`/cases/${c.id}`}
        data-testid={`pipeline-card-${c.id.slice(0, 8)}`}
        className={cn(
          "block bg-surface border border-border/80 rounded-xl p-3.5",
          "relative overflow-hidden",
          selected ? "ring-2 ring-navy/50 border-navy/50 bg-navy/5 shadow-glow-navy" : "hover:border-navy/30 hover:shadow-glow-navy",
          "transition-all duration-200"
        )}
      >
        <div className={cn("absolute top-0 left-0 bottom-0 w-1 opacity-80", "bg-gradient-to-b from-transparent to-transparent", sla === "muted" ? "" : `via-${slaBorder.split('-')[1]}`)} />
        
        <div className="flex items-center gap-2 text-xs mb-2.5 pr-6">
          <span className="text-lg leading-none drop-shadow-sm">{c.config_snapshot_json?.country_flag}</span>
          <span className="font-semibold text-ink truncate flex-1">{c.customer?.full_name || "—"}</span>
          {c.on_hold && <Stamp tone="warning" size="xs" className="shadow-sm">On Hold</Stamp>}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-ink-subtle font-mono uppercase tracking-widest bg-surface-muted px-1.5 py-0.5 rounded border border-border/50">
            {formatCaseNumber(c)}
          </span>
          <span className="text-[10px] text-ink-muted capitalize">
            • {c.source}
          </span>
        </div>

        <div className="mb-3.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-semibold text-ink-subtle uppercase tracking-wider">Docs</span>
            <span className="text-[9px] font-mono text-ink-muted">{c.docs_verified || 0}/{c.docs_required || 1}</span>
          </div>
          <MeterBar
            value={c.docs_verified || 0}
            max={c.docs_required || 1}
            tone={(c.docs_progress || 0) >= 100 ? "success" : "teal"}
            height="h-1.5"
            className="rounded-full overflow-hidden"
          />
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border", slaStyles)}>
            {c.sla_status?.replace("_", " ") || "No SLA"}
          </div>
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-card border border-border shadow-sm text-ink font-mono text-[10px] font-bold"
            title={c.assigned_consultant?.full_name || "Unassigned"}
          >
            {c.assigned_consultant?.full_name?.split(" ").map((x) => x[0]).join("") || "?"}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
