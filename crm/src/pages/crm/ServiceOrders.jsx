import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { RefreshCw, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICE_TYPE_LABELS, SERVICE_TYPE_OPTIONS } from "@/lib/leadServiceSchemas";

const ACTIVE_STAGES = ["new", "in_progress", "completed", "cancelled"];
const STAGE_LABELS = {
  new: "New",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STAGE_TONE = {
  new: "teal",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

const FILTER_KEYS = ["service_type", "status", "assigned_to", "from_date", "to_date"];
const LIST_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc" };

export default function ServiceOrders() {
  const list = useListQueryState({ filterKeys: FILTER_KEYS, defaults: LIST_DEFAULTS });
  const [viewMode, setViewMode] = useState("board");
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkConsultant, setBulkConsultant] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { ...list.apiParams };
    if (viewMode === "board") params.limit = 500;
    api.get("/crm/service-orders", { params })
      .then((r) => {
        const { items, meta: m } = unwrapListResponse(r.data);
        setOrders(items);
        setMeta(m);
        setSelected(new Set());
      })
      .catch(() => toast.error("Failed to load service orders"))
      .finally(() => setLoading(false));
  }, [list.apiParams, viewMode]);

  useEffect(() => { load(); }, [load]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(ACTIVE_STAGES.map((s) => [s, []]));
    orders.forEach((o) => {
      const st = o.status || "new";
      if (map[st]) map[st].push(o);
      else map.new.push(o);
    });
    return map;
  }, [orders]);

  const filterFields = useMemo(() => [
    { key: "service_type", label: "Service", type: "multiselect", options: SERVICE_TYPE_OPTIONS.filter((o) => o.value !== "visa" && o.value !== "passport") },
    { key: "status", label: "Status", type: "multiselect", options: ACTIVE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })) },
    {
      key: "assigned_to",
      label: "Consultant",
      type: "async",
      render: (value, onChange) => (
        <ConsultantSelect value={value || null} onChange={(v) => onChange(v || "")} placeholder="Any consultant" />
      ),
    },
    { key: "created", label: "Created", type: "daterange", fromKey: "from_date", toKey: "to_date" },
  ], []);

  const moveOrder = async (orderId, targetStage) => {
    const prev = orders;
    setOrders((rows) => rows.map((o) => (o.id === orderId ? { ...o, status: targetStage } : o)));
    try {
      await api.patch(`/crm/service-orders/${orderId}/stage`, { target_stage: targetStage });
      toast.success(`Moved to ${STAGE_LABELS[targetStage]}`);
      load();
    } catch (e) {
      setOrders(prev);
      toast.error(e.response?.data?.detail || "Move failed");
    }
  };

  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropCol = (e, stage) => {
    e.preventDefault();
    setDragOverStage("");
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveOrder(id, stage);
  };

  const bulkReassign = async () => {
    if (!bulkConsultant || selected.size === 0) return;
    setBulkBusy(true);
    try {
      await api.post("/crm/service-orders/bulk", {
        order_ids: Array.from(selected),
        action: "reassign",
        consultant_id: bulkConsultant,
      });
      toast.success(`Reassigned ${selected.size} order(s)`);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Bulk reassign failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const columns = [
    {
      key: "service_type",
      label: "Service",
      render: (row) => (
        <Stamp tone="teal" size="sm">{SERVICE_TYPE_LABELS[row.service_type] || row.service_type}</Stamp>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: false,
      render: (row) => row.customer?.full_name || "—",
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => <span className="font-mono text-xs">₹{row.amount ?? 0}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Stamp tone={STAGE_TONE[row.status] || "muted"} size="sm">{STAGE_LABELS[row.status] || row.status}</Stamp>,
    },
    {
      key: "assigned_consultant",
      label: "Assignee",
      sortable: false,
      render: (row) => row.assigned_consultant?.full_name || "—",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] p-4 overflow-hidden">
      <PageHeader
        label="Ops"
        title="Service orders"
        subtitle="Hotel, tickets, packages, insurance & car bookings"
        actions={
          <>
            <span className="text-xs font-mono text-ink-muted">{meta.total ?? orders.length} orders</span>
            <CrmButton variant="outline" size="sm" onClick={() => setViewMode(viewMode === "board" ? "list" : "board")}>
              {viewMode === "board" ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            </CrmButton>
            <CrmButton variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></CrmButton>
          </>
        }
      />

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search orders…"
        className="mb-3"
      />

      {viewMode === "list" ? (
        <div className="flex-1 overflow-auto bg-surface-card rounded-lg border border-border">
          <PaginatedTable
            columns={columns}
            data={orders}
            loading={loading}
            empty={{ title: "No service orders" }}
            page={list.page}
            limit={list.limit}
            total={meta.total || 0}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
            sortKey={list.sortBy}
            sortDir={list.sortOrder}
            onSortChange={list.setSort}
            serverSort
            selectable
            selectedIds={selected}
            onSelectionChange={setSelected}
            bulkActions={
              <>
                <div className="w-52">
                  <ConsultantSelect value={bulkConsultant || null} onChange={(v) => setBulkConsultant(v || "")} placeholder="Reassign to…" />
                </div>
                <CrmButton variant="solid" size="sm" disabled={!bulkConsultant} loading={bulkBusy} onClick={bulkReassign}>Bulk reassign</CrmButton>
              </>
            }
          />
        </div>
      ) : loading ? (
        <div className="flex gap-4 flex-1"><div className="flex-1 rounded-2xl bg-surface-muted animate-pulse" /></div>
      ) : (
        <div className="flex gap-4 min-w-max flex-1 overflow-x-auto pb-4" data-testid="service-orders-board">
          {ACTIVE_STAGES.map((s) => (
            <div
              key={s}
              className={cn(
                "kanban-col w-[300px] h-full rounded-2xl flex flex-col shrink-0 border border-border/60 bg-surface-card/30",
                dragOverStage === s && "border-navy/40 bg-navy/5",
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(s); }}
              onDragLeave={() => setDragOverStage("")}
              onDrop={(e) => onDropCol(e, s)}
            >
              <div className="px-4 py-3 border-b border-border/50 flex justify-between">
                <span className="text-xs font-semibold uppercase">{STAGE_LABELS[s]}</span>
                <span className="text-[11px] font-mono">{byStage[s].length}</span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                <AnimatePresence mode="popLayout">
                  {byStage[s].map((o) => (
                    <motion.div
                      key={o.id}
                      layout
                      draggable
                      onDragStart={(e) => onDragStart(e, o.id)}
                      className="bg-surface border border-border rounded-xl p-3 cursor-grab text-xs"
                    >
                      <div className="font-semibold mb-1">{o.customer?.full_name || "—"}</div>
                      <Stamp tone="teal" size="sm">{SERVICE_TYPE_LABELS[o.service_type] || o.service_type}</Stamp>
                      <div className="mt-2 font-mono text-ink-muted">₹{o.amount ?? 0}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
