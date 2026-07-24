import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import api, { getUser } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ArrowRight, Pencil, AlertTriangle, PauseCircle, Plus } from "lucide-react";
import { ConsultantSelect } from "@/components/forms/selects";

const STAGE_LABELS_INT = { new: "new", docs_pending: "docs pending", ready_to_submit: "ready to submit", submitted: "submitted", decision: "decision", closed: "closed" };

export default function CaseDetail() {
    const { caseId } = useParams();
    const [data, setData] = useState(null);
    const [noteBody, setNoteBody] = useState("");
    const user = getUser();

    const load = () => api.get(`/crm/cases/${caseId}`).then((r) => setData(r.data));
    useEffect(() => {
        load();
    }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!data) return <div className="p-6 text-ink-muted">Loading…</div>;

    const { case: c, customer, consultant, documents, field_values, activity, notes = [], tasks = [], valid_next_stages, has_duplicate_flag, duplicate_open_applications = [] } = data;


    const advance = async (target) => {
        try {
            await api.patch(`/crm/cases/${caseId}/stage`, { target_stage: target });
            toast.success(`Stage → ${target}`);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };
    const verify = async (docId) => {
        await api.post(`/crm/cases/${caseId}/documents/${docId}/verify`, {});
        toast.success("Verified");
        load();
    };
    const reject = async (docId) => {
        const reason = window.prompt("Reason for rejection:");
        if (!reason) return;
        await api.post(`/crm/cases/${caseId}/documents/${docId}/reject`, { reason });
        toast.success("Rejected — customer notified");
        load();
    };
    const reassign = async (cid) => {
        try {
            await api.patch(`/crm/cases/${caseId}/reassign`, { consultant_id: cid });
            toast.success("Reassigned");
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };
    const recordDecision = async (outcome) => {
        try {
            await api.post(`/crm/cases/${caseId}/decision`, { outcome });
            toast.success(`Decision: ${outcome}`);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };
    const addNote = async () => {
        const body = noteBody.trim();
        if (!body) return;
        try {
            await api.post(`/crm/cases/${caseId}/notes`, { body });
            setNoteBody("");
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed to add note");
        }
    };
    const editField = async (fieldKey, value) => {
        try {
            await api.patch(`/crm/cases/${caseId}/fields`, { field_key: fieldKey, value });
            toast.success("Field updated");
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };
    const createTask = async ({ description, due_date }) => {
        try {
            await api.post("/crm/tasks", { case_id: caseId, description, due_date: due_date || null });
            toast.success("Task created");
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };
    const completeTask = async (taskId) => {
        try {
            await api.patch(`/crm/tasks/${taskId}/done`);
            toast.success("Task marked done");
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };

    return (
        <div className="p-6">
            <Link to="/pipeline" className="text-xs text-ink-muted hover:text-ink mb-4 inline-block font-mono" data-testid="case-back">← Pipeline</Link>

            {has_duplicate_flag && (
                <div className="bg-warning/10 border border-warning text-warning rounded-sm p-3 mb-3 flex items-start gap-2 text-sm" data-testid="duplicate-banner">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-medium">Duplicate open application detected</div>
                        <div className="text-xs mt-0.5">
                            This customer has {duplicate_open_applications.length} other open case(s) for this product:{" "}
                            {duplicate_open_applications.map((d, i) => (
                                <React.Fragment key={d.id}>
                                    {i > 0 && ", "}
                                    <Link to={`/cases/${d.id}`} className="underline font-mono">#{d.id.slice(0, 8)} ({d.stage})</Link>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-surface-card border border-border rounded-sm p-4 mb-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Case #{c.id.slice(0, 8)}</div>
                        <h1 className="text-xl font-semibold flex items-center gap-2 mt-1">
                            <span className="text-2xl">{c.config_snapshot_json.country_flag}</span>
                            {c.config_snapshot_json.country_name} · {c.config_snapshot_json.visa_type}
                        </h1>
                        <div className="text-sm text-ink-muted mt-1">
                            {customer?.full_name} · {customer?.email} · <span className="font-mono">{c.source}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1.5">
                            {c.on_hold && (
                                <Stamp tone="warning" size="sm" className="flex items-center gap-1" data-testid="case-on-hold-badge">
                                    <PauseCircle className="w-3 h-3" /> On hold
                                </Stamp>
                            )}
                            <Stamp tone={c.stage === "closed" ? "gold" : "ink"} size="sm">{STAGE_LABELS_INT[c.stage]}</Stamp>
                        </div>
                        <span className="text-[10px] font-mono uppercase text-ink-muted">Due {c.sla_due_date}</span>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {valid_next_stages.map((s) => (
                        <button
                            key={s}
                            onClick={() => advance(s)}
                            data-testid={`case-advance-${s}`}
                            className="text-xs border border-navy text-navy px-2.5 py-1 rounded-sm hover:bg-navy hover:text-white flex items-center gap-1"
                        >
                            <ArrowRight className="w-3 h-3" /> {STAGE_LABELS_INT[s]}
                        </button>
                    ))}
                    {c.stage === "submitted" && (
                        <>
                            <button onClick={() => recordDecision("approved")} data-testid="case-decide-approved" className="text-xs border border-success text-success px-2.5 py-1 rounded-sm hover:bg-success hover:text-white">Approved</button>
                            <button onClick={() => recordDecision("rejected")} data-testid="case-decide-rejected" className="text-xs border border-danger text-danger px-2.5 py-1 rounded-sm hover:bg-danger hover:text-white">Rejected</button>
                            <button onClick={() => recordDecision("rfi")} data-testid="case-decide-rfi" className="text-xs border border-warning text-warning px-2.5 py-1 rounded-sm hover:bg-warning hover:text-white">RFI</button>
                        </>
                    )}
                    {(user?.role === "admin" || user?.sub === consultant?.id) && (
                        <div className="w-56" data-testid="case-reassign">
                            <ConsultantSelect
                                value={null}
                                onChange={(cid) => { if (cid) reassign(cid); }}
                                placeholder="Reassign…"
                                testId="case-reassign-select"
                                clearable={false}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabsList className="bg-surface-card border border-border rounded-sm h-auto p-0.5" data-testid="case-tabs">
                    {["overview", "documents", "payment", "tasks", "notes", "activity"].map((t) => (
                        <TabsTrigger key={t} value={t} className="text-xs uppercase font-mono tracking-widest px-3 py-1.5 rounded-sm data-[state=active]:bg-navy data-[state=active]:text-white" data-testid={`case-tab-${t}`}>
                            {t}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-surface-card border border-border rounded-sm p-4">
                            <div className="text-xs uppercase font-mono text-ink-muted mb-2">Traveler</div>
                            <dl className="text-sm space-y-1">
                                {Object.entries(c.traveler || {}).map(([k, v]) => v && (
                                    <div key={k} className="flex justify-between">
                                        <dt className="text-ink-muted capitalize">{k.replace(/_/g, " ")}</dt>
                                        <dd className="font-mono">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                        <div className="bg-surface-card border border-border rounded-sm p-4">
                            <div className="text-xs uppercase font-mono text-ink-muted mb-2">Custom fields</div>
                            <dl className="text-sm space-y-1" data-testid="custom-fields-list">
                                {field_values.length === 0 ? <span className="text-ink-muted italic text-xs">None captured</span> :
                                    field_values.map((f) => (
                                        <EditableField key={f.field_key} f={f} onSave={editField} />
                                    ))}
                            </dl>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="documents">
                    <div className="bg-surface-card border border-border rounded-sm mt-3" data-testid="case-docs">
                        <table className="w-full text-sm">
                            <thead className="bg-surface border-b border-border">
                                <tr className="text-left">
                                    <th className="px-3 py-2 text-xs uppercase font-mono">Document</th>
                                    <th className="px-3 py-2 text-xs uppercase font-mono">Required</th>
                                    <th className="px-3 py-2 text-xs uppercase font-mono">Status</th>
                                    <th className="px-3 py-2 text-xs uppercase font-mono">File</th>
                                    <th className="px-3 py-2 text-xs uppercase font-mono text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((d) => (
                                    <tr key={d.id} className="border-b border-border last:border-0">
                                        <td className="px-3 py-2">{d.doc_name || d.doc_key}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{d.required ? "yes" : "no"}</td>
                                        <td className="px-3 py-2"><Stamp tone={{ verified: "success", rejected: "danger", received: "teal", requested: "muted" }[d.status]} size="sm" className="!text-[9px] !px-1.5 !py-0.5">{d.status}</Stamp></td>
                                        <td className="px-3 py-2 font-mono text-xs truncate max-w-[200px]">{d.filename || <span className="text-ink-muted italic">—</span>}</td>
                                        <td className="px-3 py-2 text-right">
                                            {d.status === "received" && (
                                                <div className="inline-flex gap-1">
                                                    <button onClick={() => verify(d.id)} data-testid={`doc-verify-${d.doc_key}`} className="p-1 border border-success text-success rounded-sm hover:bg-success hover:text-white"><Check className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => reject(d.id)} data-testid={`doc-reject-${d.doc_key}`} className="p-1 border border-danger text-danger rounded-sm hover:bg-danger hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            )}
                                            {d.status === "verified" && <span className="text-[10px] font-mono text-success uppercase">Locked</span>}
                                            {d.status === "rejected" && (
                                                <span className="text-[10px] font-mono text-danger uppercase" title={d.rejection_reason || ""}>Rejected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                <TabsContent value="payment">
                    <div className="bg-surface-card border border-border rounded-sm mt-3 p-4 text-sm" data-testid="payment-panel">
                        <div className="grid grid-cols-2 gap-y-2">
                            <span className="text-ink-muted">Status</span><Stamp tone={c.payment_status === "paid" ? "success" : c.payment_status === "partial" ? "warning" : c.payment_status === "refunded" ? "muted" : "warning"} size="sm">{c.payment_status}</Stamp>
                            <span className="text-ink-muted">Amount</span><span className="font-mono">₹{Number(c.total_amount || 0).toLocaleString("en-IN")}</span>
                            <span className="text-ink-muted">Method</span><span className="font-mono">{c.payment_method || "—"}</span>
                            <span className="text-ink-muted">Reference</span><span className="font-mono">{c.payment_reference || "—"}</span>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="tasks">
                    <TasksPanel tasks={tasks} onCreate={createTask} onComplete={completeTask} />
                </TabsContent>

                <TabsContent value="notes">
                    <div className="bg-surface-card border border-border rounded-sm mt-3 p-4" data-testid="notes-panel">
                        <div className="flex gap-2 mb-3">
                            <textarea
                                value={noteBody}
                                onChange={(e) => setNoteBody(e.target.value)}
                                placeholder="Add an internal note (staff only, not visible to customer)…"
                                className="flex-1 border border-border rounded-sm px-2 py-1.5 text-sm min-h-[70px] outline-none focus:ring-1 focus:ring-navy focus:border-navy"
                                data-testid="note-input"
                            />
                        </div>
                        <div className="flex justify-end mb-3">
                            <button onClick={addNote} disabled={!noteBody.trim()} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover disabled:opacity-40" data-testid="note-submit">Add note</button>
                        </div>
                        <ul className="text-sm divide-y divide-border border-t border-border" data-testid="notes-list">
                            {notes.length === 0 && <li className="py-3 text-ink-muted italic text-xs">No internal notes yet.</li>}
                            {notes.map((n) => (
                                <li key={n.id} className="py-2">
                                    <div className="text-[10px] font-mono text-ink-muted uppercase tracking-widest mb-0.5">{new Date(n.created_at).toLocaleString("en-IN")}</div>
                                    <div className="text-sm whitespace-pre-wrap">{n.note}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </TabsContent>

                <TabsContent value="activity">
                    <div className="bg-surface-card border border-border rounded-sm mt-3">
                        <ul className="text-sm divide-y divide-border" data-testid="activity-log">
                            {activity.map((a) => (
                                <li key={a.id} className="px-3 py-2 flex items-start gap-3">
                                    <span className="text-[10px] font-mono text-ink-muted whitespace-nowrap w-32 shrink-0">{new Date(a.created_at).toLocaleString("en-IN")}</span>
                                    <span className="text-xs font-mono uppercase text-teal w-24 shrink-0">{a.action}</span>
                                    <span className="text-xs">{a.note}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EditableField({ f, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(f.value ?? "");

    if (editing) {
        return (
            <div className="flex justify-between items-center gap-2" data-testid={`field-edit-row-${f.field_key}`}>
                <dt className="text-ink-muted capitalize shrink-0">{f.field_key.replace(/_/g, " ")}</dt>
                <dd className="flex items-center gap-1">
                    <input
                        autoFocus
                        className="border border-border rounded-sm px-1.5 py-0.5 text-xs font-mono w-32 outline-none focus:ring-1 focus:ring-navy focus:border-navy"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        data-testid={`field-edit-input-${f.field_key}`}
                    />
                    <button
                        onClick={() => { onSave(f.field_key, val); setEditing(false); }}
                        className="p-1 border border-success text-success rounded-sm hover:bg-success hover:text-white"
                        data-testid={`field-edit-save-${f.field_key}`}
                    >
                        <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setVal(f.value ?? ""); setEditing(false); }} className="p-1 border border-border text-ink-muted rounded-sm hover:bg-surface">
                        <X className="w-3 h-3" />
                    </button>
                </dd>
            </div>
        );
    }
    return (
        <div className="flex justify-between items-center group" data-testid={`field-row-${f.field_key}`}>
            <dt className="text-ink-muted capitalize">{f.field_key.replace(/_/g, " ")}</dt>
            <dd className="font-mono flex items-center gap-1.5">
                {f.value}
                <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-navy" data-testid={`field-edit-${f.field_key}`}>
                    <Pencil className="w-3 h-3" />
                </button>
            </dd>
        </div>
    );
}

function TasksPanel({ tasks, onCreate, onComplete }) {
    const [showNew, setShowNew] = useState(false);
    const [desc, setDesc] = useState("");
    const [due, setDue] = useState("");
    const now = new Date();
    const isOverdue = (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < now;

    const submit = () => {
        if (!desc.trim()) return;
        onCreate({ description: desc.trim(), due_date: due });
        setDesc(""); setDue(""); setShowNew(false);
    };

    return (
        <div className="bg-surface-card border border-border rounded-sm mt-3 p-4" data-testid="tasks-panel">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase font-mono text-ink-muted">Case tasks</div>
                <button onClick={() => setShowNew((s) => !s)} className="text-xs inline-flex items-center gap-1 border border-navy text-navy px-2 py-1 rounded-sm hover:bg-navy hover:text-white" data-testid="task-new-btn">
                    <Plus className="w-3.5 h-3.5" /> New task
                </button>
            </div>
            {showNew && (
                <div className="grid grid-cols-[1fr_140px_auto] gap-2 mb-3 items-end" data-testid="task-new-form">
                    <label className="text-xs">
                        <span className="text-ink-muted block mb-1">Description</span>
                        <input className="w-full h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy" value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="task-desc-input" />
                    </label>
                    <label className="text-xs">
                        <span className="text-ink-muted block mb-1">Due date</span>
                        <input type="date" className="w-full h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy" value={due} onChange={(e) => setDue(e.target.value)} data-testid="task-due-input" />
                    </label>
                    <button onClick={submit} disabled={!desc.trim()} className="h-8 text-sm px-3 bg-navy text-white rounded-sm hover:bg-navy-hover disabled:opacity-40" data-testid="task-create-submit">Create</button>
                </div>
            )}
            <ul className="text-sm divide-y divide-border border-t border-border" data-testid="tasks-list">
                {tasks.length === 0 && <li className="py-3 text-ink-muted italic text-xs">No tasks on this case.</li>}
                {tasks.map((t) => (
                    <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className={`truncate ${t.status === "done" ? "line-through text-ink-muted" : ""}`}>{t.description}</div>
                            <div className="text-[10px] font-mono text-ink-muted mt-0.5">
                                {t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString("en-IN")}` : "No due date"}
                            </div>
                        </div>
                        {t.status === "done" ? (
                            <Stamp tone="success" size="sm">done</Stamp>
                        ) : (
                            <div className="flex items-center gap-2 shrink-0">
                                {isOverdue(t) && <Stamp tone="danger" size="sm" className="!text-[9px] !px-1.5 !py-0.5">overdue</Stamp>}
                                <button onClick={() => onComplete(t.id)} className="p-1 border border-success text-success rounded-sm hover:bg-success hover:text-white" data-testid={`task-done-${t.id}`}>
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
