import React from "react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

function OpsToggleChip({ label, count, active, onClick, testId, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium text-[11px] px-3 py-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/50",
        active
          ? "bg-navy text-white border-navy shadow-[0_2px_8px_rgba(15,40,32,0.25)]"
          : "bg-surface-card text-ink-muted border-border hover:text-ink hover:border-navy/30",
      )}
    >
      <span>{label}</span>
      {count != null && (
        <span
          className={cn(
            "font-mono text-[10px] px-1.5 py-0.5 leading-none rounded-full min-w-[1.25rem] text-center",
            active
              ? "bg-white/20 text-white"
              : danger && count > 0
                ? "bg-danger/10 text-danger border border-danger/30"
                : "bg-surface-muted text-ink-muted border border-border/50",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function GroupDivider() {
  return <div className="hidden md:block w-px h-6 bg-border shrink-0" aria-hidden />;
}

export function PipelineQuickFilters({
  filters,
  setFilters,
  summary,
  activeStages,
  stageLabels,
  stageTotal = 0,
  testId = "pipeline-quick-filters",
}) {
  const bySla = summary?.by_sla || {};
  const byStage = summary?.by_stage || {};
  const overdueCount = bySla.overdue || 0;
  const dueSoonCount = bySla.due_soon || 0;

  const slaValue = filters.sla || "";
  const onSlaChange = (v) => {
    if (v === slaValue) setFilters({ sla: "" });
    else setFilters({ sla: v || "" });
  };

  const toggleFilter = (key, activeValue) => {
    setFilters({ [key]: filters[key] === activeValue ? "" : activeValue });
  };

  const stageValue = filters.stage || "";
  const onStageChange = (v) => {
    setFilters({ stage: v === stageValue ? "" : v });
  };

  const opsChips = [
    {
      key: "unassigned",
      label: "Unassigned",
      activeValue: "true",
      count: summary?.unassigned,
      testId: `${testId}-unassigned`,
    },
    {
      key: "on_hold",
      label: "On hold",
      activeValue: "true",
      count: summary?.on_hold,
      testId: `${testId}-on-hold`,
    },
    {
      key: "payment_status",
      label: "Pending payment",
      activeValue: "pending",
      count: summary?.pending_payment,
      testId: `${testId}-pending-payment`,
    },
  ];

  return (
    <div className="mb-3 space-y-3" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={slaValue}
          onChange={onSlaChange}
          segments={[
            { value: "", label: "All SLA" },
            {
              value: "overdue",
              label: "Overdue",
              count: overdueCount,
              countDanger: true,
            },
            {
              value: "due_soon",
              label: "Due soon",
              count: dueSoonCount,
            },
          ]}
          testId={`${testId}-sla`}
        />

        <GroupDivider />

        <div className="inline-flex flex-wrap items-center gap-1.5" role="group" aria-label="Operations filters">
          {opsChips.map((chip) => (
            <OpsToggleChip
              key={chip.key}
              label={chip.label}
              count={chip.count}
              active={filters[chip.key] === chip.activeValue}
              onClick={() => toggleFilter(chip.key, chip.activeValue)}
              testId={chip.testId}
              danger={chip.key === "unassigned" && (chip.count || 0) > 0}
            />
          ))}
        </div>

        <GroupDivider />

        <Segmented
          value={filters.case_type || "visa"}
          onChange={(v) => setFilters({ case_type: v || "visa" })}
          segments={[
            { value: "visa", label: "Visa" },
            { value: "passport", label: "Passport" },
          ]}
          testId={`${testId}-case-type`}
        />
      </div>

      <Segmented
        value={stageValue}
        onChange={onStageChange}
        segments={[
          { value: "", label: "All stages", count: stageTotal || summary?.total || 0 },
          ...activeStages.map((s) => ({
            value: s,
            label: stageLabels[s] || s,
            count: byStage[s] || 0,
          })),
        ]}
        testId={`${testId}-stage`}
      />
    </div>
  );
}
