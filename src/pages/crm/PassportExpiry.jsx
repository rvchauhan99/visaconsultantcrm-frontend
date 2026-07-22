import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { AlertTriangle } from "lucide-react";

/**
 * CRM: Passport expiry dashboard.
 * Aggregates passports from cases + saved traveler profiles.
 */
export default function PassportExpiry() {
    const [rows, setRows] = useState([]);
    const [window_, setWindow] = useState(180);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get(`/crm/passport-expiry?days=${window_}`)
            .then((r) => setRows(r.data))
            .finally(() => setLoading(false));
    }, [window_]);

    const buckets = {
        expired: rows.filter((r) => r.urgency === "expired"),
        critical: rows.filter((r) => r.urgency === "critical"),
        urgent: rows.filter((r) => r.urgency === "urgent"),
        monitor: rows.filter((r) => r.urgency === "monitor"),
    };

    return (
        <div className="p-6">
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Renewal watch</div>
                    <h1 className="text-xl font-semibold">Passport expiry</h1>
                </div>
                <select value={window_} onChange={(e) => setWindow(Number(e.target.value))} className="text-sm border border-border rounded-sm px-2 py-1" data-testid="expiry-window">
                    <option value={30}>Next 30 days</option>
                    <option value={90}>Next 90 days</option>
                    <option value={180}>Next 180 days</option>
                    <option value={365}>Next 365 days</option>
                    <option value={3650}>All expiries on file</option>
                </select>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
                <Bucket label="Expired" count={buckets.expired.length} tone="danger" />
                <Bucket label="≤ 30 days" count={buckets.critical.length} tone="danger" />
                <Bucket label="≤ 90 days" count={buckets.urgent.length} tone="warning" />
                <Bucket label="Monitor" count={buckets.monitor.length} tone="teal" />
            </div>

            {loading ? (
                <div className="text-ink-muted p-6">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="bg-white border border-border rounded-sm p-8 text-center text-sm text-ink-muted">
                    No passports expiring in this window. 🎉
                </div>
            ) : (
                <div className="bg-white border border-border rounded-sm">
                    <table className="w-full text-sm" data-testid="expiry-table">
                        <thead className="bg-surface border-b border-border">
                            <tr className="text-left">
                                <th className="px-3 py-2 text-xs font-mono uppercase">Customer</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Passport</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Expiry</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Days</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Sources</th>
                                <th className="px-3 py-2 text-xs font-mono uppercase">Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} className="border-b border-border last:border-0" data-testid={`expiry-row-${i}`}>
                                    <td className="px-3 py-2">{r.customer_name}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{r.passport_number || "—"}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{r.passport_expiry_date}</td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                        <Stamp tone={r.urgency === "expired" || r.urgency === "critical" ? "danger" : r.urgency === "urgent" ? "warning" : "teal"} size="sm">{r.days_left}d</Stamp>
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                        {r.sources.map((s, j) => (
                                            <span key={j}>
                                                {s.type === "case" ? (
                                                    <Link to={`/crm/cases/${s.case_id}`} className="text-teal hover:underline">{s.country}</Link>
                                                ) : (
                                                    <span className="text-ink-muted">Profile · {s.relationship}</span>
                                                )}
                                                {j < r.sources.length - 1 && ", "}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">{r.customer_email}<br />{r.customer_phone}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function Bucket({ label, count, tone }) {
    const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-teal";
    return (
        <div className="bg-white border border-border rounded-sm p-3">
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">{label}</div>
            <div className={`font-mono text-2xl font-semibold ${color}`}>{count}</div>
        </div>
    );
}
