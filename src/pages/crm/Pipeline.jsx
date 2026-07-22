import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";

const STAGES = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
const STAGE_LABELS = {
    new: "New", docs_pending: "Docs pending", ready_to_submit: "Ready to submit",
    submitted: "Submitted", decision: "Decision", closed: "Closed",
};

export default function Pipeline() {
    const [cases, setCases] = useState([]);
    const [countries, setCountries] = useState([]);
    const [filterCountry, setFilterCountry] = useState("");
    const [filterSla, setFilterSla] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/visa-products/countries").then((r) => setCountries(r.data));
        load();
    }, []);

    const load = () => {
        setLoading(true);
        api.get("/crm/cases").then((r) => { setCases(r.data); setLoading(false); });
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

    return (
        <div className="p-6">
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Cases</div>
                    <h1 className="text-xl font-semibold">Pipeline</h1>
                </div>
                <div className="text-xs font-mono text-ink-muted">{filtered.length} of {cases.length}</div>
            </div>

            {/* Persistent filters */}
            <div className="bg-white border border-border rounded-sm p-2.5 mb-4 flex flex-wrap gap-3 items-center text-sm">
                <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="border border-border rounded-sm px-2 py-1 text-sm" data-testid="pipeline-filter-country">
                    <option value="">All countries</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
                <select value={filterSla} onChange={(e) => setFilterSla(e.target.value)} className="border border-border rounded-sm px-2 py-1 text-sm" data-testid="pipeline-filter-sla">
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
                        <div key={s} className="bg-white border border-border rounded-sm" data-testid={`pipeline-col-${s}`}>
                            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wider">{STAGE_LABELS[s]}</span>
                                <span className="text-[10px] font-mono text-ink-muted" data-testid={`pipeline-col-count-${s}`}>{byStage[s].length}</span>
                            </div>
                            <div className="p-2 space-y-2 min-h-[100px]">
                                {byStage[s].map((c) => <PipelineCard key={c.id} c={c} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PipelineCard({ c }) {
    const slaColor = { on_track: "success", due_soon: "warning", overdue: "danger", completed: "muted" }[c.sla_status] || "muted";
    return (
        <Link
            to={`/crm/cases/${c.id}`}
            data-testid={`pipeline-card-${c.id.slice(0, 8)}`}
            className="block bg-surface border border-border rounded-sm p-2.5 hover:border-navy transition-colors"
        >
            <div className="flex items-center gap-1.5 text-[11px] mb-1">
                <span>{c.config_snapshot_json.country_flag}</span>
                <span className="font-medium truncate">{c.customer?.full_name || "—"}</span>
            </div>
            <div className="text-[10px] text-ink-muted font-mono uppercase tracking-widest mb-1.5">
                #{c.id.slice(0, 8)} · {c.source}
            </div>
            <div className="flex items-center justify-between">
                <Stamp tone={slaColor} size="sm" className="!text-[9px] !px-1.5 !py-0.5">{c.sla_status?.replace("_", " ") || "—"}</Stamp>
                <span className="text-[10px] font-mono text-ink-muted">{c.assigned_consultant?.full_name?.split(" ").map(x => x[0]).join("") || "—"}</span>
            </div>
        </Link>
    );
}
