import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Check } from "lucide-react";

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

    return (
        <div className="p-6">
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Assigned to me</div>
                    <h1 className="text-xl font-semibold">My tasks</h1>
                </div>
                <div className="flex items-center gap-3">
                    {overdueCount > 0 && <Stamp tone="danger" size="sm">{overdueCount} overdue</Stamp>}
                    <label className="text-xs flex items-center gap-1.5 text-ink-muted">
                        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} data-testid="tasks-show-done" />
                        Show completed
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="text-ink-muted p-6">Loading…</div>
            ) : (
                <div className="bg-surface-card border border-border rounded-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-surface border-b border-border">
                            <tr className="text-left">
                                <th className="px-3 py-2 text-xs font-mono uppercase">Description</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Case</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Due date</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Status</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody data-testid="tasks-table">
                            {visible.map((t) => (
                                <tr key={t.id} className={`border-b border-border last:border-0 ${isOverdue(t) ? "bg-danger/5" : ""}`} data-testid={`task-row-${t.id}`}>
                                    <td className={`px-3 py-2 ${t.status === "done" ? "line-through text-ink-muted" : ""}`}>{t.description}</td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                        {t.case_id ? <Link to={`/cases/${t.case_id}`} className="text-navy hover:underline">#{t.case_id.slice(0, 8)}</Link> : <span className="text-ink-muted italic">—</span>}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                        {t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN") : <span className="text-ink-muted italic">no due date</span>}
                                    </td>
                                    <td className="px-3 py-2">
                                        {t.status === "done" ? (
                                            <Stamp tone="success" size="sm">done</Stamp>
                                        ) : isOverdue(t) ? (
                                            <Stamp tone="danger" size="sm">overdue</Stamp>
                                        ) : (
                                            <Stamp tone="muted" size="sm">open</Stamp>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {t.status !== "done" && (
                                            <button onClick={() => complete(t.id)} className="p-1 border border-success text-success rounded-sm hover:bg-success hover:text-white" data-testid={`task-complete-${t.id}`}>
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {visible.length === 0 && (
                                <tr><td colSpan={5} className="px-3 py-4 text-ink-muted italic text-center">No tasks to show.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
