import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getUser } from "@/lib/api";
import Stamp from "@/components/Stamp";
import TravelerProfiles from "@/components/customer/TravelerProfiles";
import CustomerProfile from "@/components/customer/CustomerProfile";
import { Plus } from "lucide-react";

const STAGE_LABELS = {
    new: "Application received", docs_pending: "In review", ready_to_submit: "Preparing",
    submitted: "Submitted", decision: "Decision", closed: "Completed",
};

export default function Account() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = getUser();

    useEffect(() => {
        api.get("/cases/my").then((r) => { setCases(r.data); setLoading(false); });
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
                            <Link
                                key={c.id}
                                to={`/status/${c.id}`}
                                data-testid={`account-case-${c.id.slice(0, 6)}`}
                                className="flex items-center justify-between p-5 bg-white border border-border rounded-xl hover:shadow-card transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">{c.config_snapshot_json.country_flag}</span>
                                    <div>
                                        <div className="font-medium">{c.config_snapshot_json.title}</div>
                                        <div className="text-xs font-mono uppercase text-ink-muted tracking-widest mt-0.5">
                                            Case #{c.id.slice(0, 8)} · {new Date(c.created_at).toLocaleDateString("en-IN")}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <Stamp tone={c.sla_status === "overdue" ? "danger" : c.sla_status === "due_soon" ? "warning" : c.sla_status === "completed" ? "gold" : "success"} size="sm">
                                        {STAGE_LABELS[c.stage] || c.stage}
                                    </Stamp>
                                    <span className="text-[10px] font-mono uppercase text-ink-muted">By {new Date(c.sla_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
