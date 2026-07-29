import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import api, { openReceipt } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { RefreshCw, Upload, Loader2, CheckCircle2, XCircle, Receipt, AlertTriangle } from "lucide-react";

const STAGE_ORDER = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];

export default function StatusTracker() {
    const { caseId } = useParams();
    const [data, setData] = useState(null);

    const load = () => api.get(`/cases/${caseId}/status`).then((r) => setData(r.data));
    useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [caseId]);

    if (!data) return <div className="max-w-3xl mx-auto p-10 text-ink-muted">Loading…</div>;

    const c = data.case;
    const snapshot = c.config_snapshot_json;
    const currentIdx = STAGE_ORDER.indexOf(c.stage);
    const rejected = data.documents.filter((d) => d.status === "rejected");

    return (
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
            <Link to="/account" className="text-sm text-ink-muted hover:text-ink mb-6 inline-block" data-testid="status-back">← My applications</Link>

            <div className="mb-8 flex flex-wrap items-center gap-4 justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{snapshot.country_flag}</span>
                        <h1 className="font-display text-3xl text-navy leading-tight">{snapshot.title}</h1>
                    </div>
                    <div className="text-xs font-mono uppercase tracking-widest text-ink-muted">
                        Case #{c.id.slice(0, 8)} · Applied {new Date(c.created_at).toLocaleDateString("en-IN")}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Guaranteed by</div>
                    <div className="font-display text-2xl text-navy">{c.sla_due_date ? new Date(c.sla_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</div>
                    <SlaBadge status={data.sla_status} />
                </div>
            </div>

            {/* On hold — needs attention */}
            {data.on_hold && (
                <div className="bg-warning/10 border-l-4 border-warning rounded-xl p-5 mb-8 flex items-start gap-3" data-testid="on-hold-banner">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                        <div className="font-medium text-warning">Additional information needed</div>
                        <div className="text-sm text-ink-muted mt-0.5">Your consultant has put this case on hold. Please check the documents below or wait for their message.</div>
                    </div>
                </div>
            )}

            {/* Timeline — passport collecting stamps */}
            <div className="bg-white border border-border rounded-xl p-6 md:p-8 mb-8">
                <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-6">Your journey</div>
                <ol className="space-y-6">
                    {STAGE_ORDER.filter((s) => s !== "new").map((s, i) => {
                        const label = data.customer_facing_stage_flow.find((x) => x.stage === s)?.label || s;
                        const state = i < currentIdx ? "past" : i === currentIdx ? "current" : "future";
                        return (
                            <li key={s} className="flex gap-4" data-testid={`timeline-${s}`}>
                                <div className="shrink-0">
                                    {state === "past" ? (
                                        <Stamp tone="gold" size="lg" fill="filled" className="!p-0 w-14 h-14 !rounded-full">✓</Stamp>
                                    ) : state === "current" ? (
                                        <Stamp tone="ink" size="lg" className="!text-navy !border-navy w-14 h-14 !p-0 !rounded-full motion-safe:animate-stamp-in">{i + 1}</Stamp>
                                    ) : (
                                        <span className="w-14 h-14 rounded-full border-2 border-dashed border-border text-ink-muted flex items-center justify-center font-mono">{i + 1}</span>
                                    )}
                                </div>
                                <div className="flex-1 pt-2">
                                    <div className={`text-base font-medium ${state === "future" ? "text-ink-muted" : "text-ink"}`}>{label}</div>
                                    {state === "current" && <div className="text-sm text-ink-muted mt-1">This is where you are now.</div>}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>

            {/* Rejected documents — actionable */}
            {rejected.length > 0 && (
                <div className="bg-white border-l-4 border-danger rounded-xl p-6 mb-8" data-testid="rejected-panel">
                    <h3 className="font-medium text-danger mb-3 flex items-center gap-2"><XCircle className="w-5 h-5" /> Action needed</h3>
                    {rejected.map((d) => (
                        <ResubmitDoc key={d.id} doc={d} caseId={caseId} onDone={load} />
                    ))}
                </div>
            )}

            {/* Documents overview */}
            <div className="bg-white border border-border rounded-xl p-6 md:p-8 mb-8">
                <h3 className="font-display text-lg text-navy mb-4">Your documents</h3>
                <ul className="space-y-2">
                    {data.documents.map((d) => (
                        <li key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`status-doc-${d.doc_key}`}>
                            <span className="text-sm">{d.doc_name}</span>
                            <DocStatusStamp status={d.status} />
                        </li>
                    ))}
                </ul>
            </div>

            {/* Payment */}
            <div className="bg-white border border-border rounded-xl p-6 md:p-8">
                <h3 className="font-display text-lg text-navy mb-4">Payment</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-display text-ink">₹{c.total_amount.toLocaleString("en-IN")}</div>
                        <div className="text-xs font-mono uppercase text-ink-muted">{c.payment_method} · {c.payment_reference}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Stamp tone={c.payment_status === "paid" ? "success" : "warning"} size="sm">{c.payment_status}</Stamp>
                        {c.payment_status === "paid" && (
                            <button
                                onClick={() => openReceipt(c.id).catch(() => toast.error("Couldn't open receipt"))}
                                data-testid="download-receipt"
                                className="inline-flex items-center gap-1.5 text-xs text-teal hover:underline"
                            >
                                <Receipt className="w-3.5 h-3.5" /> Download receipt
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DocStatusStamp({ status }) {
    const tone = { requested: "muted", received: "teal", verified: "success", rejected: "danger" }[status] || "muted";
    return <Stamp tone={tone} size="sm">{status}</Stamp>;
}
function SlaBadge({ status }) {
    const tone = { on_track: "success", due_soon: "warning", overdue: "danger", completed: "gold" }[status] || "muted";
    const label = { on_track: "On track", due_soon: "Due soon", overdue: "Overdue", completed: "Completed" }[status] || status;
    return <div className="mt-1"><Stamp tone={tone} size="sm">{label}</Stamp></div>;
}

function ResubmitDoc({ doc, caseId, onDone }) {
    const [busy, setBusy] = useState(false);
    const handle = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const up = await api.post("/documents/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
            await api.post(`/cases/${caseId}/documents/${doc.id}/resubmit`, {
                file_url: up.data.file_url,
                filename: up.data.filename,
                storage_key: up.data.storage_key || up.data.key || null,
            });
            toast.success("Document re-uploaded — we'll review shortly.");
            onDone();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Upload failed");
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="py-3 flex items-start gap-4 border-b last:border-0 border-border">
            <RefreshCw className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1">
                <div className="font-medium text-sm">{doc.doc_name}</div>
                <div className="text-sm text-ink-muted mt-1">Reason: {doc.rejection_reason || "Not specified"}</div>
            </div>
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm border border-danger text-danger rounded-full px-3 py-1.5 hover:bg-danger hover:text-white transition-colors">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Re-upload
                <input type="file" hidden onChange={handle} data-testid={`resubmit-${doc.doc_key}`} />
            </label>
        </div>
    );
}
