import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { getUser } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ListChecks, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmCard } from "@/components/ui/crm-card";
import { CrmField, CrmInput, CrmSelect } from "@/components/ui/crm-field";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Segmented } from "@/components/ui/segmented";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { ConsultantSelect } from "@/components/forms/selects";
import { cn, formatCaseNumber } from "@/lib/utils";

const PRIORITY_TONE = { high: "danger", normal: "muted", low: "teal" };
const FILTER_KEYS = ["status", "priority", "category", "due", "from_date", "to_date", "assigned_to"];
const LIST_DEFAULTS = { status: "open", limit: "25", sort_by: "due_date", sort_order: "asc" };

export default function Tasks() {
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    due_date: "",
    priority: "normal",
    category: "",
    assigned_to: user?.id || null,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/crm/tasks/my", { params: list.apiParams })
      .then((r) => {
        const { items, meta: m } = unwrapListResponse(r.data);
        setTasks(items);
        setMeta(m);
      })
      .catch(() => toast.error("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, [list.apiParams]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const isOverdue = (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < now;

  const complete = async (taskId) => {
    try {
      await api.patch(`/crm/tasks/${taskId}/done`);
      toast.success("Task marked done");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const openForm = () => {
    setShowForm((s) => {
      if (!s) {
        setForm({
          description: "",
          due_date: "",
          priority: "normal",
          category: "",
          assigned_to: user?.id || null,
        });
      }
      return !s;
    });
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const body = {
        description: form.description.trim(),
        due_date: form.due_date || null,
        priority: form.priority || "normal",
        assigned_to: form.assigned_to || user?.id || null,
      };
      if (form.category.trim()) body.category = form.category.trim();
      await api.post("/crm/tasks", body);
      toast.success("Task created");
      setForm({
        description: "",
        due_date: "",
        priority: "normal",
        category: "",
        assigned_to: user?.id || null,
      });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const filterFields = useMemo(() => {
    const fields = [
      {
        key: "priority",
        label: "Priority",
        type: "select",
        options: [
          { value: "high", label: "High" },
          { value: "normal", label: "Normal" },
          { value: "low", label: "Low" },
        ],
      },
      { key: "category", label: "Category", type: "text", placeholder: "Category" },
      {
        key: "due",
        label: "Due bucket",
        type: "select",
        options: [
          { value: "overdue", label: "Overdue" },
          { value: "today", label: "Due today" },
        ],
      },
      { key: "due_range", label: "Due date", type: "daterange", fromKey: "from_date", toKey: "to_date" },
    ];
    if (isAdmin) {
      fields.unshift({
        key: "assigned_to",
        label: "Owner",
        type: "async",
        render: (value, onChange) => (
          <ConsultantSelect
            value={value || null}
            onChange={(v) => onChange(v || "")}
            placeholder="All owners"
            testId="tasks-filter-owner"
          />
        ),
      });
    }
    return fields;
  }, [isAdmin]);

  const columns = [
    {
      key: "description",
      label: "Description",
      render: (row) => (
        <span className={cn("text-ink", row.status === "done" && "line-through text-ink-muted")}>
          {row.description}
        </span>
      ),
    },
    {
      key: "assigned_to",
      label: "Owner",
      sortable: false,
      render: (row) =>
        row.assigned_name
          ? <span className="text-xs text-ink">{row.assigned_name}</span>
          : <span className="text-ink-muted text-xs">—</span>,
    },
    {
      key: "priority",
      label: "Priority",
      render: (row) => row.priority
        ? <Stamp tone={PRIORITY_TONE[row.priority] || "muted"} size="sm">{row.priority}</Stamp>
        : <span className="text-ink-muted text-xs">—</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (row) => row.category
        ? <span className="text-xs text-ink-muted capitalize">{row.category}</span>
        : <span className="text-ink-muted text-xs">—</span>,
    },
    {
      key: "case_id",
      label: "Case",
      sortable: false,
      render: (row) =>
        row.case_id
          ? <Link to={`/cases/${row.case_id}`} className="font-mono text-navy hover:underline text-xs">{formatCaseNumber(row)}</Link>
          : <span className="text-ink-muted italic text-xs">—</span>,
    },
    {
      key: "due_date",
      label: "Due date",
      render: (row) => row.due_date
        ? <span className={cn("font-mono text-xs", isOverdue(row) && "text-danger font-semibold")}>
            {new Date(row.due_date).toLocaleDateString("en-IN")}
          </span>
        : <span className="text-ink-muted italic text-xs">no due date</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: (row) =>
        row.status === "done" ? <Stamp tone="success" size="sm">done</Stamp>
        : isOverdue(row) ? <Stamp tone="danger" size="sm">overdue</Stamp>
        : <Stamp tone="muted" size="sm">open</Stamp>,
    },
    {
      key: "_actions",
      label: "",
      sortable: false,
      headerClassName: "text-right",
      className: "text-right",
      render: (row) =>
        row.status !== "done" ? (
          <CrmButton
            variant="success"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); complete(row.id); }}
            data-testid={`task-complete-${row.id}`}
            title="Mark done"
          >
            <Check className="w-3 h-3" />
          </CrmButton>
        ) : null,
    },
  ];

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        label={isAdmin ? "All tasks" : "Assigned to me"}
        title={isAdmin ? "Tasks" : "My tasks"}
        actions={
          <CrmButton variant="outline" size="sm" onClick={openForm} data-testid="task-new-btn">
            <Plus className="w-3.5 h-3.5" /> New task
          </CrmButton>
        }
      />

      <Segmented
        value={list.filters.status || "open"}
        onChange={(v) => list.setFilters({ status: v })}
        segments={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ]}
        testId="tasks-filter"
      />

      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search tasks…"
        testId="tasks-filters"
      />

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <CrmCard className="p-4">
              <form onSubmit={createTask} className="grid md:grid-cols-[1fr_140px_120px_140px_1fr_auto] gap-3 items-end" data-testid="task-new-form">
                <CrmField label="Description" required>
                  <CrmInput required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="task-desc-input" />
                </CrmField>
                <CrmField label="Due date">
                  <CrmInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="task-due-input" />
                </CrmField>
                <CrmField label="Priority">
                  <CrmSelect value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} data-testid="task-priority-input">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </CrmSelect>
                </CrmField>
                <CrmField label="Category">
                  <CrmInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="optional" data-testid="task-category-input" />
                </CrmField>
                <CrmField label="Assigned to">
                  <ConsultantSelect
                    value={form.assigned_to}
                    onChange={(id) => setForm({ ...form, assigned_to: id || user?.id || null })}
                    placeholder="Select owner…"
                    testId="task-assignee-select"
                  />
                </CrmField>
                <CrmButton variant="solid" size="sm" type="submit" loading={saving} data-testid="task-create-submit">Create</CrmButton>
              </form>
            </CrmCard>
          </motion.div>
        )}
      </AnimatePresence>

      <PaginatedTable
        columns={columns}
        data={tasks}
        loading={loading}
        empty={{
          icon: ListChecks,
          title: "No tasks to show",
          description: (list.filters.status || "open") === "open" ? "Switch to Done to see completed tasks." : "",
        }}
        page={list.page}
        limit={list.limit}
        total={meta.total || 0}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        sortKey={list.sortBy}
        sortDir={list.sortOrder}
        onSortChange={list.setSort}
        serverSort
        rowTestId={(row) => `task-row-${row.id}`}
        testId="tasks-table"
      />
    </div>
  );
}
