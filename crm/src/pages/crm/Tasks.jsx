import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Check, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard, CrmEmptyState } from "@/components/ui/crm-card";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/crm/tasks/my").then((r) => { setTasks(r.data); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const now = new Date();
  const isOverdue = (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < now;

  const visible = useMemo(
    () => tasks.filter((t) => (showDone ? true : t.status !== "done")),
    [tasks, showDone],
  );

  const complete = async (taskId) => {
    try {
      await api.patch(`/crm/tasks/${taskId}/done`);
      toast.success("Task marked done");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const overdueCount = tasks.filter(isOverdue).length;

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
      key: "case_id",
      label: "Case",
      render: (row) =>
        row.case_id
          ? <Link to={`/cases/${row.case_id}`} className="font-mono text-navy hover:underline text-xs">#{row.case_id.slice(0, 8)}</Link>
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
    <div className="p-6">
      <PageHeader
        label="Assigned to me"
        title="My tasks"
        actions={
          <div className="flex items-center gap-3">
            {overdueCount > 0 && <Stamp tone="danger" size="sm">{overdueCount} overdue</Stamp>}
            <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="rounded"
                data-testid="tasks-show-done"
              />
              Show completed
            </label>
          </div>
        }
      />

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={visible}
          loading={loading}
          rowTestId={(row) => `task-row-${row.id}`}
          empty={{
            icon: ListChecks,
            title: "No tasks to show",
            description: showDone ? "" : "Enable 'Show completed' to see past tasks.",
          }}
        />
      </CrmTableCard>
    </div>
  );
}
