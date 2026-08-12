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
import { PipelineQuickFilters } from "@/components/crm/pipeline/PipelineQuickFilters";
import { MeterBar } from "@/components/ui/meter-bar";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { RefreshCw, LayoutGrid, List, AlertTriangle } from "lucide-react";
import { cn, formatCaseNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import "./pipeline.css";

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const ACTIVE_STAGES = ["new", "docs_pending", "ready_to_submit", "submitted", "decision"];
const STAGE_LABELS = {
  new: "New",
  docs_pending: "Docs pending",
  ready_to_submit: "Ready",
  submitted: "Submitted",
  decision: "Decision",
  closed: "Closed",
};

const SLA_TONE = {
  on_track: "success",
  due_soon: "warning",
  overdue: "danger",
  completed: "muted",
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

/* ════════════════════════════════════════════
   Pipeline — Main Component
   ════════════════════════════════════════════ */

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

  /* ── Filter params (exclude pagination / stage for board requests) ── */
  const filterParams = useMemo(() => {
    const p = { ...list.apiParams };
    delete p.page;
    delete p.limit;
    delete p.stage;
    return p;
  }, [list.apiParams]);

  /* ── Data loading ── */
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

    // Board: summary + per-stage pages
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

  /* ── Load more for board columns ── */
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

  /* ── Derived data ── */
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

  /* ── Filter fields (for advanced panel) ── */
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

  /* ── Drag & drop ── */
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

  /* ── Bulk operations ── */
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

  /* ── List columns ── */
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
      render: (c) => <Stamp tone={SLA_TONE[c.sla_status] || "muted"} size="sm">{c.sla_status?.replace("_", " ") || "—"}</Stamp>,
    },
    {
      key: "assigned_consultant",
      label: "Assignee",
      sortable: false,
      render: (c) => <span className="text-xs">{c.assigned_consultant?.full_name || "—"}</span>,
    },
  ];

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* ─────── ZONE 1: Compact Toolbar ─────── */}
      <div className="px-4 lg:px-5">
        {/* Row 1: Title + Actions */}
        <div className="pipeline-toolbar">
          <div className="pipeline-toolbar__title">
            <h1>Pipeline</h1>
            <span className="pipeline-toolbar__count" data-testid="pipeline-total-count">
              {meta.total ?? cases.length}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex p-0.5 rounded-lg bg-surface-muted border border-border gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={cn(
                  "relative p-1.5 rounded-md transition-all duration-200",
                  viewMode === "board"
                    ? "bg-navy text-white shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-surface-card",
                )}
                data-testid="pipeline-view-board"
                title="Board view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "relative p-1.5 rounded-md transition-all duration-200",
                  viewMode === "list"
                    ? "bg-navy text-white shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-surface-card",
                )}
                data-testid="pipeline-view-list"
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <CrmButton
              variant="outline"
              size="sm"
              onClick={load}
              data-testid="pipeline-refresh"
              className="rounded-lg h-8"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </CrmButton>
          </div>
        </div>

        {/* Row 2: Full-width Filter Panel */}
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
          className="mb-0 rounded-xl"
        />
      </div>

      {/* ─────── ZONE 2: Unified Controls Strip ─────── */}
      <div className="px-4 lg:px-5 border-b border-border">
        <PipelineQuickFilters
          filters={list.filters}
          setFilters={list.setFilters}
          summary={summary}
          activeStages={ACTIVE_STAGES}
          stageLabels={STAGE_LABELS}
          stageTotal={stageTotal}
        />
      </div>

      {/* ─────── Board truncation warning ─────── */}
      {boardTruncated && viewMode === "board" && (
        <div className="px-4 lg:px-5 pt-2">
          <div className="pipeline-board-cap" data-testid="pipeline-board-cap">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            <span className="flex-1">Some columns show a page of cases — use Load more in each column, or switch to list view for full pagination.</span>
            <CrmButton variant="outline" size="xs" onClick={() => setViewMode("list")}>List view</CrmButton>
          </div>
        </div>
      )}

      {/* ─────── ZONE 3: Content Area ─────── */}
      {viewMode === "list" ? (
        /* ── List View ── */
        <div className="flex-1 overflow-auto px-4 lg:px-5 py-3">
          <div className="bg-surface-card rounded-xl border border-border shadow-sm">
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
        </div>
      ) : loading ? (
        /* ── Board Skeleton ── */
        <div className="flex gap-3 flex-1 overflow-hidden px-4 lg:px-5 py-3">
          {ACTIVE_STAGES.map((s) => (
            <div key={s} className="pipeline-skeleton-col h-full" />
          ))}
        </div>
      ) : (
        /* ── Board View ── */
        <div className="pipeline-board flex-1 px-4 lg:px-5 py-2" data-testid="pipeline-board">
          {ACTIVE_STAGES.map((s) => (
            <div
              key={s}
              className={cn(
                "pipeline-column",
                dragOverStage === s && "pipeline-column--drag-over",
              )}
              data-testid={`pipeline-col-${s}`}
              onDragOver={(e) => onDragOverCol(e, s)}
              onDragLeave={() => setDragOverStage((cur) => (cur === s ? "" : cur))}
              onDrop={(e) => onDropCol(e, s)}
            >
              {/* Column header */}
              <div className="pipeline-column__header">
                <div className="pipeline-column__stage-info">
                  <span className={`pipeline-column__dot pipeline-column__dot--${s}`} />
                  <span className="pipeline-column__label">{STAGE_LABELS[s]}</span>
                </div>
                <span
                  className={cn(
                    "pipeline-column__count-badge",
                    (stageCounts[s] || byStage[s].length) > 0
                      ? "pipeline-column__count-badge--filled"
                      : "pipeline-column__count-badge--empty",
                  )}
                  data-testid={`pipeline-col-count-${s}`}
                >
                  {stageCounts[s] ?? byStage[s].length}
                </span>
              </div>

              {/* Column body */}
              <div className="pipeline-column__body">
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

                {/* Drop zone indicator */}
                {byStage[s].length === 0 && dragOverStage === s && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pipeline-drop-zone"
                  >
                    Drop case here
                  </motion.div>
                )}

                {/* Load more */}
                {(boardByStage[s]?.has_more || (byStage[s].length < (stageCounts[s] || 0))) && (
                  <CrmButton
                    variant="outline"
                    size="sm"
                    className="w-full rounded-lg text-ink-muted hover:text-ink mt-1 text-[11px]"
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

      {/* ─────── Bulk action bar (board mode) ─────── */}
      {viewMode === "board" && bulkAvailable && selected.size > 0 && (
        <div className="pipeline-bulk-bar" data-testid="pipeline-bulk-bar">
          <span className="text-xs font-semibold text-ink">{selected.size} selected</span>
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

/* ════════════════════════════════════════════
   PipelineCard — Redesigned Kanban Card
   ════════════════════════════════════════════ */

function PipelineCard({ c, onDragStart, selected, onToggleSelect, showSelect }) {
  const slaTone = SLA_TONE[c.sla_status] || "muted";

  return (
    <motion.div
      layout
      layoutId={c.id}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      draggable
      onDragStart={(e) => onDragStart(e, c.id)}
      className="cursor-grab active:cursor-grabbing relative group"
    >
      {/* Checkbox */}
      {showSelect && (
        <label
          className="pipeline-card__checkbox-wrap"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="pipeline-card__checkbox"
            data-testid={`pipeline-card-select-${c.id.slice(0, 8)}`}
          />
        </label>
      )}

      <Link
        to={`/cases/${c.id}`}
        data-testid={`pipeline-card-${c.id.slice(0, 8)}`}
        className={cn(
          "pipeline-card",
          selected && "pipeline-card--selected",
        )}
      >
        {/* SLA left-edge color indicator — hardcoded classes */}
        <div className={`pipeline-card__sla-edge pipeline-card__sla-edge--${slaTone}`} />

        {/* Top: Flag + Name + On Hold badge */}
        <div className="pipeline-card__top">
          <span className="pipeline-card__flag">{c.config_snapshot_json?.country_flag}</span>
          <span className="pipeline-card__name">{c.customer?.full_name || "—"}</span>
          {c.on_hold && <Stamp tone="warning" size="xs">On Hold</Stamp>}
        </div>

        {/* Meta: Case number + Source */}
        <div className="pipeline-card__meta">
          <span className="pipeline-card__case-num">{formatCaseNumber(c)}</span>
          <span className="pipeline-card__source">• {c.source}</span>
        </div>

        {/* Docs progress */}
        <div className="pipeline-card__docs">
          <div className="pipeline-card__docs-header">
            <span className="pipeline-card__docs-label">Docs</span>
            <span className="pipeline-card__docs-ratio">{c.docs_verified || 0}/{c.docs_required || 1}</span>
          </div>
          <MeterBar
            value={c.docs_verified || 0}
            max={c.docs_required || 1}
            tone={(c.docs_progress || 0) >= 100 ? "success" : "teal"}
            height="h-1"
            className="rounded-full overflow-hidden"
          />
        </div>

        {/* Footer: SLA badge + Avatar */}
        <div className="pipeline-card__footer">
          <div className={`pipeline-card__sla-badge pipeline-card__sla-badge--${slaTone}`}>
            {c.sla_status?.replace("_", " ") || "No SLA"}
          </div>
          <div
            className="pipeline-card__avatar"
            title={c.assigned_consultant?.full_name || "Unassigned"}
          >
            {c.assigned_consultant?.full_name?.split(" ").map((x) => x[0]).join("") || "?"}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
