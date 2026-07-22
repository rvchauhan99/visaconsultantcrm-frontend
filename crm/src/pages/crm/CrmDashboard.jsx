import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";

export default function CrmDashboard() {
    const [pipeline, setPipeline] = useState(null);
    const [sla, setSla] = useState(null);
    const [funnel, setFunnel] = useState(null);
    const [recent, setRecent] = useState([]);
    const [workload, setWorkload] = useState(null);

    useEffect(() => {
        api.get("/crm/reports/pipeline").then((r) => setPipeline(r.data));
        api.get("/crm/reports/sla").then((r) => setSla(r.data));
        api.get("/crm/reports/funnel").then((r) => setFunnel(r.data));
        api.get("/crm/cases").then((r) => setRecent(r.data.slice(0, 6)));
        api.get("/crm/workload").then((r) => setWorkload(r.data));
    }, []);

    return (
        <div className="p-6 max-w-full">
            <div className="mb-6">
                <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Overview</div>
                <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="dashboard-metrics">
                <StatCard label="Open cases" value={pipeline?.total_open ?? "—"} />
                <StatCard label="Overdue" value={sla?.overdue ?? "—"} tone={sla?.overdue > 0 ? "danger" : ""} />
                <StatCard label="Due soon" value={sla?.due_soon ?? "—"} tone={sla?.due_soon > 0 ? "warning" : ""} />
                <StatCard label="Completed" value={funnel?.closed ?? "—"} />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-white border border-border rounded-sm p-4">
                    <div className="text-xs uppercase font-mono text-ink-muted mb-3">By stage</div>
                    <table className="w-full text-sm">
                        <tbody>
                            {pipeline && Object.entries(pipeline.by_stage).map(([k, v]) => (
                                <tr key={k} className="border-b border-border last:border-0">
                                    <td className="py-1.5 capitalize">{k.replace(/_/g, " ")}</td>
                                    <td className="text-right font-mono">{v}</td>
                                </tr>
                            ))}
                            {pipeline && Object.keys(pipeline.by_stage).length === 0 && (
                                <tr><td className="py-2 text-ink-muted italic">No open cases yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white border border-border rounded-sm p-4">
                    <div className="text-xs uppercase font-mono text-ink-muted mb-3">Recent cases</div>
                    <ul className="text-sm divide-y divide-border">
                        {recent.map((c) => (
                            <li key={c.id}>
                                <Link to={`/cases/${c.id}`} className="flex justify-between py-1.5 hover:text-navy" data-testid={`recent-case-${c.id.slice(0, 6)}`}>
                                    <span className="truncate">{c.config_snapshot_json.country_name} · {c.customer?.full_name}</span>
                                    <span className="font-mono text-xs text-ink-muted uppercase">{c.stage}</span>
                                </Link>
                            </li>
                        ))}
                        {recent.length === 0 && <li className="py-2 text-ink-muted italic">No cases yet.</li>}
                    </ul>
                </div>

                <div className="bg-white border border-border rounded-sm p-4 md:col-span-2" data-testid="workload-panel">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-xs uppercase font-mono text-ink-muted">My workload</div>
                        {workload && (
                            <div className="flex items-center gap-2 text-xs font-mono">
                                <Stamp tone="ink" size="sm">{workload.open} open</Stamp>
                                <Stamp tone={workload.due_soon > 0 ? "warning" : "muted"} size="sm">{workload.due_soon} due soon</Stamp>
                                <Stamp tone={workload.overdue > 0 ? "danger" : "muted"} size="sm">{workload.overdue} overdue</Stamp>
                            </div>
                        )}
                    </div>
                    <ul className="text-sm divide-y divide-border">
                        {workload?.cases.slice(0, 8).map((c) => (
                            <li key={c.id}>
                                <Link to={`/cases/${c.id}`} className="flex justify-between py-1.5 hover:text-navy" data-testid={`workload-case-${c.id.slice(0, 6)}`}>
                                    <span className="truncate">{c.country} · {c.title}</span>
                                    <span className={`font-mono text-xs uppercase ${c.sla_status === "overdue" ? "text-danger" : c.sla_status === "due_soon" ? "text-warning" : "text-ink-muted"}`}>
                                        {c.sla_status?.replace("_", " ")}
                                    </span>
                                </Link>
                            </li>
                        ))}
                        {workload && workload.cases.length === 0 && <li className="py-2 text-ink-muted italic">No open cases assigned.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, tone }) {
    const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
    return (
        <div className="bg-white border border-border rounded-sm p-4">
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">{label}</div>
            <div className={`font-mono text-2xl font-semibold ${color}`}>{value}</div>
        </div>
    );
}
