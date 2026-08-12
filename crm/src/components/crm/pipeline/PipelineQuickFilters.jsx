import React from "react";
import { cn } from "@/lib/utils";

/**
 * Pipeline quick-filter chip — unified design.
 */
function Chip({ label, count, active, onClick, testId, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn("pipeline-chip", active && "pipeline-chip--active")}
    >
      <span>{label}</span>
      {count != null && (
        <span
          className={cn(
            "pipeline-chip__badge",
            !active && danger && count > 0 && "pipeline-chip__badge--danger",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="pipeline-controls__divider" aria-hidden />;
}

/**
 * PipelineQuickFilters — single unified horizontal control strip.
 *
 * Renders: SLA filter chips | Divider | Ops chips | Divider | Case-type toggle | Divider | Stage tabs
 *
 * The stage filter is only rendered HERE (not duplicated elsewhere).
 */
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
      danger: true,
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

  const allStageSegments = [
    { value: "", label: "All stages", count: stageTotal || summary?.total || 0 },
    ...activeStages.map((s) => ({
      value: s,
      label: stageLabels[s] || s,
      count: byStage[s] || 0,
    })),
  ];

  return (
    <div className="pipeline-controls" data-testid={testId}>
      {/* ── SLA filters ── */}
      <Chip
        label="All SLA"
        active={slaValue === ""}
        onClick={() => onSlaChange("")}
        testId={`${testId}-sla-all`}
      />
      <Chip
        label="Overdue"
        count={overdueCount}
        active={slaValue === "overdue"}
        onClick={() => onSlaChange("overdue")}
        testId={`${testId}-sla-overdue`}
        danger
      />
      <Chip
        label="Due soon"
        count={dueSoonCount}
        active={slaValue === "due_soon"}
        onClick={() => onSlaChange("due_soon")}
        testId={`${testId}-sla-due-soon`}
      />

      <Divider />

      {/* ── Ops chips ── */}
      {opsChips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          count={chip.count}
          active={filters[chip.key] === chip.activeValue}
          onClick={() => toggleFilter(chip.key, chip.activeValue)}
          testId={chip.testId}
          danger={chip.danger && (chip.count || 0) > 0}
        />
      ))}

      <Divider />

      {/* ── Case type toggle ── */}
      <Chip
        label="Visa"
        active={(filters.case_type || "visa") === "visa"}
        onClick={() => setFilters({ case_type: "visa" })}
        testId={`${testId}-case-type-visa`}
      />
      <Chip
        label="Passport"
        active={filters.case_type === "passport"}
        onClick={() => setFilters({ case_type: "passport" })}
        testId={`${testId}-case-type-passport`}
      />

      <Divider />

      {/* ── Stage tabs ── */}
      <div className="pipeline-stage-bar" data-testid={`${testId}-stage`}>
        {allStageSegments.map((seg) => {
          const isActive = stageValue === seg.value;
          return (
            <button
              key={seg.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onStageChange(seg.value)}
              className={cn(
                "pipeline-stage-tab",
                isActive && "pipeline-stage-tab--active",
              )}
              data-testid={`${testId}-stage-${seg.value}`}
            >
              <span className="relative z-10">{seg.label}</span>
              {seg.count != null && (
                <span className="pipeline-stage-tab__count">{seg.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
