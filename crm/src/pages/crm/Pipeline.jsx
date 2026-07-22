import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";

const STAGES = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
const STAGE_LABELS = {
    new: "New", docs_pending: "Docs pending", ready_to_submit: "Ready to submit",
    submitted: "Submitted", decision: "Decision", closed: "Closed",
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

    useEffect(() => {
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        load();
    }, [filterConsultant, filterStage, filterSource]); // eslint-disable-line react-hooks/exhaustive-deps

    const load = () => {
        setLoading(true);
        const params = {};
        if (filterConsultant) params.consultant_id = filterConsultant;
        if (filterStage) params.stage = filterStage;
        if (filterSource) params.source = filterSource;
        api.get("/crm/cases", { params }).then((r) => { setCases(r.data); setLoading(false); });
    };

    const filtered = useMemo(() => {
        return cases.filter((c) => {
            if (filterCountry && c.config_snapshot_json.country_code !== filterCountry) return false;
            if (filterSla && c.sla_status !== filterSla) return false;
            return true;
        });
    }, [cases, filterCountry, filterSla]);

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
            toast.error(e.response?.data?.detail || "Move failed — guard condition not met");
        }
    };

    const onDragStart = (e, caseId) => {
        e.dataTransfer.setData("text/case-id", caseId);
        e.dataTransfer.effectAllowed = "move";
    };
    const onDragOverCol = (e, stage) => {
        e.preventDefault();
        setDragOverStage(stage);
    };
    const onDropCol = (e, stage) => {
        e.preventDefault();
        setDragOverStage("");
        const caseId = e.dataTransfer.getData("text/case-id");
        if (caseId) moveCard(caseId, stage);
    };

    return (
        <div className="p-6">
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Cases</div>
                    <h1 className="text-xl font-semibold">Pipeline</h1>
                </div>
                <div className="text-xs font-mono text-ink-muted">{filtered.length} of {cases.length}</div>
            </div>

            <div className="bg-white border border-border rounded-sm p-2.5 mb-4 flex flex-wrap gap-3 items-center text-sm">
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
                <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="border border-border rounded-sm px-2 py-1 text-sm h-8" data-testid="pipeline-filter-stage">
                    <option value="">All stages</option>
                    {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
                <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="border border-border rounded-sm px-2 py-1 text-sm h-8" data-testid="pipeline-filter-source">
                    <option value="">Any source</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                </select>
                <select value={filterSla} onChange={(e) => setFilterSla(e.target.value)} className="border border-border rounded-sm px-2 py-1 text-sm h-8" data-testid="pipeline-filter-sla">
                    <option value="">Any SLA</option>
                    <option value="on_track">On track</option>
                    <option value="due_soon">Due soon</option>
                    <option value="overdue">Overdue</option>
                </select>
                <button onClick={load} className="text-xs text-ink-muted hover:text-ink" data-testid="pipeline-refresh">Refresh</button>
            </div>

            {loading ? (
                <div className="text-ink-muted p-6">Loading…</div>
            ) : (
                <div className="grid grid-cols-6 gap-2 min-w-[1100px]" data-testid="pipeline-board">
                    {STAGES.map((s) => (
                        <div
                            key={s}
                            className={`bg-white border rounded-sm ${dragOverStage === s ? "border-navy ring-1 ring-navy" : "border-border"}`}
                            data-testid={`pipeline-col-${s}`}
                            onDragOver={(e) => onDragOverCol(e, s)}
                            onDragLeave={() => setDragOverStage((cur) => (cur === s ? "" : cur))}
                            onDrop={(e) => onDropCol(e, s)}
                        >
                            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wider">{STAGE_LABELS[s]}</span>
                                <span className="text-[10px] font-mono text-ink-muted" data-testid={`pipeline-col-count-${s}`}>{byStage[s].length}</span>
                            </div>
                            <div className="p-2 space-y-2 min-h-[100px]">
                                {byStage[s].map((c) => <PipelineCard key={c.id} c={c} onDragStart={onDragStart} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PipelineCard({ c, onDragStart }) {
    const slaColor = { on_track: "success", due_soon: "warning", overdue: "danger", completed: "muted" }[c.sla_status] || "muted";
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, c.id)}
            className="cursor-grab active:cursor-grabbing"
        >
            <Link
                to={`/cases/${c.id}`}
                data-testid={`pipeline-card-${c.id.slice(0, 8)}`}
                className="block bg-surface border border-border rounded-sm p-2.5 hover:border-navy transition-colors"
            >
                <div className="flex items-center gap-1.5 text-[11px] mb-1">
                    <span>{c.config_snapshot_json.country_flag}</span>
                    <span className="font-medium truncate">{c.customer?.full_name || "—"}</span>
                    {c.on_hold && <Stamp tone="warning" size="sm" className="!text-[9px] !px-1 !py-0">hold</Stamp>}
                </div>
                <div className="text-[10px] text-ink-muted font-mono uppercase tracking-widest mb-1.5">
                    #{c.id.slice(0, 8)} · {c.source}
                </div>
                <div className="flex items-center justify-between">
                    <Stamp tone={slaColor} size="sm" className="!text-[9px] !px-1.5 !py-0.5">{c.sla_status?.replace("_", " ") || "—"}</Stamp>
                    <span className="text-[10px] font-mono text-ink-muted">{c.assigned_consultant?.full_name?.split(" ").map(x => x[0]).join("") || "—"}</span>
                </div>
            </Link>
        </div>
    );
}
