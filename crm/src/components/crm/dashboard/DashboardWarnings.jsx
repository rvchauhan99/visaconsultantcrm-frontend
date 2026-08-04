import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { CrmCard, CrmEmptyState, CrmTableCard, CrmCardHeader } from "@/components/ui/crm-card";
import { appendScope, RISK_ITEMS } from "@/lib/dashboardUtils";
import { cn } from "@/lib/utils";

function RiskRow({ label, count, tone, to, scope }) {
  if (!count) return null;
  return (
    <Link
      to={appendScope(to, scope)}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-0",
        "hover:bg-surface-muted/40 transition-colors",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          "w-2 h-2 rounded-full shrink-0",
          tone === "danger" && "bg-danger",
          tone === "warning" && "bg-warning",
          tone === "default" && "bg-ink-muted",
        )}
        />
        <span className="text-sm text-ink truncate">{label}</span>
      </div>
      <span className="font-mono text-sm font-semibold text-ink shrink-0">{count}</span>
    </Link>
  );
}

export default function DashboardWarnings({ risk, scope, loading }) {
  const items = RISK_ITEMS.map((item) => ({
    ...item,
    count: typeof risk?.[item.key] === "number" ? risk[item.key] : 0,
  })).filter((item) => item.count > 0);

  return (
    <CrmTableCard data-testid="dashboard-warnings">
      <CrmCardHeader
        label="Attention"
        title="Warnings & risks"
        actions={<AlertTriangle className="w-4 h-4 text-warning" />}
      />
      {loading ? (
        <div className="p-6 text-sm text-ink-muted">Loading…</div>
      ) : items.length === 0 ? (
        <CrmEmptyState title="All clear" description="No items need immediate attention." />
      ) : (
        <div>
          {items.map((item) => (
            <RiskRow key={item.key} {...item} scope={scope} />
          ))}
        </div>
      )}
    </CrmTableCard>
  );
}

export function DashboardQueueSections({ queues, scope, loading }) {
  if (!queues && !loading) return null;
  return (
    <div className="space-y-4" data-testid="dashboard-queues">
      <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-ink-muted">Work queues</div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: "Leads", keys: ["leads_due_today", "leads_overdue"] },
          { title: "Tasks", keys: ["tasks_due_today", "tasks_overdue"] },
          { title: "Cases", keys: ["unassigned_cases", "docs_pending_review", "on_hold"] },
          { title: "Finance", keys: ["pending_payments"] },
        ].map((section) => (
          <CrmCard key={section.title} className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">{section.title}</div>
            <div className="space-y-2">
              {section.keys.map((key) => {
                const meta = {
                  leads_due_today: { label: "Due today", to: "/follow-ups?due=today" },
                  leads_overdue: { label: "Overdue", to: "/follow-ups?due=overdue" },
                  tasks_due_today: { label: "Due today", to: "/tasks?status=open&due=today" },
                  tasks_overdue: { label: "Overdue", to: "/tasks?status=open&due=overdue" },
                  unassigned_cases: { label: "Unassigned", to: "/pipeline?unassigned=true" },
                  docs_pending_review: { label: "Docs review", to: "/pipeline?stage=docs_pending" },
                  on_hold: { label: "On hold", to: "/pipeline?on_hold=true" },
                  pending_payments: { label: "Pending pay", to: "/pipeline?payment_status=pending" },
                }[key];
                const count = queues?.[key] ?? (loading ? "…" : 0);
                return (
                  <Link
                    key={key}
                    to={appendScope(meta.to, scope)}
                    className="flex items-center justify-between text-sm hover:text-navy transition-colors"
                  >
                    <span className="text-ink-muted">{meta.label}</span>
                    <span className="font-mono font-semibold">{count}</span>
                  </Link>
                );
              })}
            </div>
          </CrmCard>
        ))}
      </div>
    </div>
  );
}
