import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import api, { getUser } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ArrowRight, Loader2 } from "lucide-react";

const STAGE_LABELS_INT = { new: "new", docs_pending: "docs pending", ready_to_submit: "ready to submit", submitted: "submitted", decision: "decision", closed: "closed" };

export default function CaseDetail() {
    const { caseId } = useParams();
    const [data, setData] = useState(null);
    const [consultants, setConsultants] = useState([]);
    const user = getUser();

    const load = () => api.get(`/crm/cases/${caseId}`).then((r) => setData(r.data));
    useEffect(() => {
        load();
        api.get("/crm/consultants").then((r) => setConsultants(r.data));
    }, [caseId]);

    if (!data) return <div className="p-6 text-ink-muted">Loading…</div>;

    const { case: c, customer, consultant, documents, field_values, activity, valid_next_stages } = data;

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

    return (
        <div className="p-6">
            <Link to="/pipeline" className="text-xs text-ink-muted hover:text-ink mb-4 inline-block font-mono" data-testid="case-back">← Pipeline</Link>

            {/* Header */}
            <div className="bg-white border border-border rounded-sm p-4 mb-4">
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
                        <Stamp tone={c.stage === "closed" ? "gold" : "ink"} size="sm">{STAGE_LABELS_INT[c.stage]}</Stamp>
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
                        <select
                            value={consultant?.id || ""}
                            onChange={(e) => reassign(e.target.value)}
                            className="text-xs border border-border rounded-sm px-2 py-1"
                            data-testid="case-reassign"
                        >
                            <option value="">Reassign…</option>
                            {consultants.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.country_codes.join(",")}) · {c.open_cases} open</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabsList className="bg-white border border-border rounded-sm h-auto p-0.5" data-testid="case-tabs">
                    {["overview", "documents", "payment", "activity"].map((t) => (
                        <TabsTrigger key={t} value={t} className="text-xs uppercase font-mono tracking-widest px-3 py-1.5 rounded-sm data-[state=active]:bg-navy data-[state=active]:text-white" data-testid={`case-tab-${t}`}>
                            {t}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-white border border-border rounded-sm p-4">
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
                        <div className="bg-white border border-border rounded-sm p-4">
                            <div className="text-xs uppercase font-mono text-ink-muted mb-2">Custom fields</div>
                            <dl className="text-sm space-y-1">
                                {field_values.length === 0 ? <span className="text-ink-muted italic text-xs">None captured</span> :
                                    field_values.map((f) => (
                                        <div key={f.field_key} className="flex justify-between">
                                            <dt className="text-ink-muted capitalize">{f.field_key.replace(/_/g, " ")}</dt>
                                            <dd className="font-mono">{f.value}</dd>
                                        </div>
                                    ))}
                            </dl>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="documents">
                    <div className="bg-white border border-border rounded-sm mt-3" data-testid="case-docs">
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
                    <div className="bg-white border border-border rounded-sm mt-3 p-4 text-sm">
                        <div className="grid grid-cols-2 gap-y-2">
                            <span className="text-ink-muted">Status</span><Stamp tone={c.payment_status === "paid" ? "success" : "warning"} size="sm">{c.payment_status}</Stamp>
                            <span className="text-ink-muted">Amount</span><span className="font-mono">₹{c.total_amount.toLocaleString("en-IN")}</span>
                            <span className="text-ink-muted">Method</span><span className="font-mono">{c.payment_method || "—"}</span>
                            <span className="text-ink-muted">Reference</span><span className="font-mono">{c.payment_reference || "—"}</span>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="activity">
                    <div className="bg-white border border-border rounded-sm mt-3">
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
