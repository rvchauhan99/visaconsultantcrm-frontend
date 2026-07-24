import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { getUser, openReceipt } from "@/lib/api";
import Stamp from "@/components/Stamp";
import TravelerProfiles from "@/components/customer/TravelerProfiles";
import CustomerProfile from "@/components/customer/CustomerProfile";
import { Plus, Receipt, FileEdit } from "lucide-react";

const STAGE_LABELS = {
    new: "Application received", docs_pending: "In review", ready_to_submit: "Preparing",
    submitted: "Submitted", decision: "Decision", closed: "Completed",
};

export default function Account() {
    const [cases, setCases] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = getUser();

    useEffect(() => {
        api.get("/cases/my").then((r) => { setCases(r.data); setLoading(false); });
        api.get("/cases/drafts").then(async (r) => {
            const raw = r.data || [];
            const enriched = await Promise.all(
                raw.map(async (d) => {
                    try {
                        const p = await api.get(`/visa-products/${d.visa_product_id}`);
                        return { ...d, product: p.data };
                    } catch (_) {
                        return { ...d, product: null };
                    }
                })
            );
            setDrafts(enriched.filter((d) => d.product));
        }).catch(() => {});
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
            <div>
                <h1 className="text-2xl font-semibold mb-1">My account</h1>
                <p className="text-sm text-ink-muted">Signed in as {user?.email}</p>
            </div>

            {/* Customer profile — DOB + anniversary */}
            <CustomerProfile />

            {/* Saved travelers */}
            <TravelerProfiles />

            {/* In-progress drafts */}
            {drafts.length > 0 && (
                <div>
                    <h2 className="text-lg font-medium mb-3">Continue where you left off</h2>
                    <div className="space-y-3">
                        {drafts.map((d) => (
                            <div key={d.id} className="flex items-center justify-between p-4 bg-white border border-dashed border-border rounded-xl" data-testid={`account-draft-${d.id.slice(0, 6)}`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{d.product.country_flag}</span>
                                    <div>
                                        <div className="font-medium">{d.product.title}</div>
                                        <div className="text-xs font-mono uppercase text-ink-muted tracking-widest mt-0.5">
                                            Started {new Date(d.created_at).toLocaleDateString("en-IN")} · step: {d.step || "traveler"}
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    to={`/apply/${d.visa_product_id}?draft=${d.id}`}
                                    data-testid={`continue-draft-${d.id.slice(0, 6)}`}
                                    className="inline-flex items-center gap-1.5 text-sm border border-navy text-navy rounded-full px-4 py-2 hover:bg-navy hover:text-white transition-colors"
                                >
                                    <FileEdit className="w-3.5 h-3.5" /> Continue application
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Applications */}
            <div>
                <h2 className="text-lg font-medium mb-3">My applications</h2>
                {loading ? (
                    <div className="p-8 text-ink-muted">Loading…</div>
                ) : cases.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-xl bg-white">
                        <Stamp tone="gold" size="md" className="mx-auto mb-4">Passport ready?</Stamp>
                        <h3 className="text-lg font-medium mb-2">Start your first visa application</h3>
                        <p className="text-sm text-ink-muted mb-6">Choose a destination and we'll take it from there.</p>
                        <Link to="/" className="inline-flex items-center gap-2 bg-navy text-white rounded-full px-5 py-2.5 text-sm hover:bg-navy-hover" data-testid="account-start-cta">
                            <Plus className="w-4 h-4" /> Browse visas
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cases.map((c) => (
                            <div
                                key={c.id}
                                data-testid={`account-case-${c.id.slice(0, 6)}`}
                                className="flex items-center justify-between p-5 bg-white border border-border rounded-xl hover:shadow-card transition-shadow"
                            >
                                <Link to={`/status/${c.id}`} className="flex items-center gap-4 flex-1">
                                    <span className="text-3xl">{c.config_snapshot_json.country_flag}</span>
                                    <div>
                                        <div className="font-medium">{c.config_snapshot_json.title}</div>
                                        <div className="text-xs font-mono uppercase text-ink-muted tracking-widest mt-0.5">
                                            Case #{c.id.slice(0, 8)} · {new Date(c.created_at).toLocaleDateString("en-IN")}
                                        </div>
                                    </div>
                                </Link>
                                <div className="flex flex-col items-end gap-1.5">
                                    <Stamp tone={c.sla_status === "overdue" ? "danger" : c.sla_status === "due_soon" ? "warning" : c.sla_status === "completed" ? "gold" : "success"} size="sm">
                                        {STAGE_LABELS[c.stage] || c.stage}
                                    </Stamp>
                                    <span className="text-[10px] font-mono uppercase text-ink-muted">By {new Date(c.sla_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                    {c.payment_status === "paid" && (
                                        <button
                                            onClick={() => openReceipt(c.id).catch(() => toast.error("Couldn't open receipt"))}
                                            data-testid={`account-receipt-${c.id.slice(0, 6)}`}
                                            className="inline-flex items-center gap-1 text-[11px] text-teal hover:underline mt-1"
                                        >
                                            <Receipt className="w-3 h-3" /> Receipt
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
