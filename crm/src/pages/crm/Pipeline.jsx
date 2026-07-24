import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
const STAGE_LABELS = {
  new: "New",
  docs_pending: "Docs pending",
  ready_to_submit: "Ready",
  submitted: "Submitted",
  decision: "Decision",
  closed: "Closed",
};
const STAGE_COLORS = {
  new: "bg-ink-muted/20 text-ink-muted",
  docs_pending: "bg-warning/15 text-warning",
  ready_to_submit: "bg-teal/15 text-teal",
  submitted: "bg-navy/10 text-navy",
  decision: "bg-gold/15 text-gold",
  closed: "bg-success/10 text-success",
};
const slaStamp = {
  on_track: "success", due_soon: "warning", overdue: "danger", completed: "muted",
};

export default function Pipeline() {
  const [cases, setCases] = useState([]);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterSla, setFilterSla] = useState("");
  const [filterConsultant, setFilterConsultant] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState("");

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { load(); }, [filterConsultant, filterStage, filterSource]); // eslint-disable-line

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterConsultant) params.consultant_id = filterConsultant;
    if (filterStage) params.stage = filterStage;
    if (filterSource) params.source = filterSource;
    api.get("/crm/cases", { params }).then((r) => { setCases(r.data); setLoading(false); });
  };

  const filtered = useMemo(() =>
    cases.filter((c) => {
      if (filterCountry && c.config_snapshot_json.country_code !== filterCountry) return false;
      if (filterSla && c.sla_status !== filterSla) return false;
      return true;
    }),
    [cases, filterCountry, filterSla],
  );

  const byStage = useMemo(() => {
    const m = Object.fromEntries(STAGES.map((s) => [s, []]));
    filtered.forEach((c) => m[c.stage]?.push(c));
    return m;
  }, [filtered]);

  const moveCard = async (caseId, targetStage) => {
    const prevCases = cases;
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1 || cases[idx].stage === targetStage) return;
    setCases((cs) => cs.map((c) => (c.id === caseId ? { ...c, stage: targetStage } : c)));
    try {
      await api.patch(`/crm/cases/${caseId}/stage`, { target_stage: targetStage });
      toast.success(`Moved to ${STAGE_LABELS[targetStage]}`);
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

  return (
    <div className="p-6">
      <PageHeader
        label="Cases"
        title="Pipeline"
        actions={
          <>
            <span className="text-xs font-mono text-ink-muted">{filtered.length} of {cases.length}</span>
            <CrmButton variant="outline" size="sm" onClick={load} data-testid="pipeline-refresh">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </CrmButton>
          </>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap gap-2 items-center bg-surface-card border border-border rounded-[10px] p-2.5 shadow-[var(--shadow-card)]">
        <div className="w-44">
          <CountrySelect
            value={filterCountry || null}
            onChange={(v) => setFilterCountry(v || "")}
            placeholder="All countries"
            testId="pipeline-filter-country"
          />
        </div>
        <div className="w-52">
          <ConsultantSelect
            value={filterConsultant || null}
            onChange={(v) => setFilterConsultant(v || "")}
            placeholder="All consultants"
            testId="pipeline-filter-consultant"
          />
        </div>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="crm-input w-36"
          data-testid="pipeline-filter-stage"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="crm-input w-28"
          data-testid="pipeline-filter-source"
        >
          <option value="">Any source</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <select
          value={filterSla}
          onChange={(e) => setFilterSla(e.target.value)}
          className="crm-input w-32"
          data-testid="pipeline-filter-sla"
        >
          <option value="">Any SLA</option>
          <option value="on_track">On track</option>
          <option value="due_soon">Due soon</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex gap-3 min-w-max">
          {STAGES.map((s) => (
            <div key={s} className="kanban-col h-64 bg-gradient-to-b from-surface-muted to-surface-card animate-[shimmer_1.6s_linear_infinite]" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 min-w-max pb-4" data-testid="pipeline-board">
          {STAGES.map((s) => (
            <div
              key={s}
              className={cn("kanban-col", dragOverStage === s && "drag-over")}
              data-testid={`pipeline-col-${s}`}
              onDragOver={(e) => onDragOverCol(e, s)}
              onDragLeave={() => setDragOverStage((cur) => cur === s ? "" : cur)}
              onDrop={(e) => onDropCol(e, s)}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", {
                    "bg-ink-muted": s === "new",
                    "bg-warning": s === "docs_pending",
                    "bg-teal": s === "ready_to_submit",
                    "bg-navy": s === "submitted",
                    "bg-gold": s === "decision",
                    "bg-success": s === "closed",
                  })} />
                  <span className="text-[11px] font-semibold text-ink uppercase tracking-wider">
                    {STAGE_LABELS[s]}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded-full",
                    byStage[s].length > 0 ? "bg-navy/8 text-navy" : "bg-surface-muted text-ink-muted",
                  )}
                  data-testid={`pipeline-col-count-${s}`}
                >
                  {byStage[s].length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[120px]">
                {byStage[s].map((c) => <PipelineCard key={c.id} c={c} onDragStart={onDragStart} />)}
                {byStage[s].length === 0 && dragOverStage === s && (
                  <div className="h-16 rounded-lg border-2 border-dashed border-navy/30 flex items-center justify-center text-[10px] text-ink-muted">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineCard({ c, onDragStart }) {
  const sla = slaStamp[c.sla_status] || "muted";
  const slaBorder = {
    success: "border-l-success",
    warning: "border-l-warning",
    danger:  "border-l-danger",
    muted:   "border-l-border",
  }[sla];

  return (
    <div draggable onDragStart={(e) => onDragStart(e, c.id)} className="cursor-grab active:cursor-grabbing">
      <Link
        to={`/cases/${c.id}`}
        data-testid={`pipeline-card-${c.id.slice(0, 8)}`}
        className={cn(
          "block bg-surface border border-border rounded-lg p-2.5",
          "border-l-[3px]",
          slaBorder,
          "hover:shadow-[var(--shadow-premium)] hover:-translate-y-px",
          "transition-all duration-150",
        )}
      >
        {/* Name + on-hold */}
        <div className="flex items-center gap-1.5 text-xs mb-1.5">
          <span className="text-base leading-none">{c.config_snapshot_json.country_flag}</span>
          <span className="font-medium text-ink truncate flex-1">{c.customer?.full_name || "—"}</span>
          {c.on_hold && <Stamp tone="warning" size="sm">hold</Stamp>}
        </div>

        {/* Case ID + source */}
        <div className="text-[10px] text-ink-muted font-mono uppercase tracking-widest mb-2">
          #{c.id.slice(0, 8)} · {c.source}
        </div>

        {/* SLA + assignee */}
        <div className="flex items-center justify-between">
          <Stamp tone={sla} size="sm">
            {c.sla_status?.replace("_", " ") || "—"}
          </Stamp>
          <span className={cn(
            "text-[10px] font-mono font-semibold w-6 h-6 rounded-full flex items-center justify-center",
            "bg-surface-muted border border-border text-ink-muted",
          )}>
            {c.assigned_consultant?.full_name?.split(" ").map((x) => x[0]).join("") || "?"}
          </span>
        </div>
      </Link>
    </div>
  );
}
