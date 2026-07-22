import React, { useEffect, useState } from "react";
import api from "@/lib/api";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function Reports() {
    const [pipeline, setPipeline] = useState(null);
    const [sla, setSla] = useState(null);
    const [funnel, setFunnel] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [reject, setReject] = useState([]);

    useEffect(() => {
        api.get("/crm/reports/pipeline").then((r) => setPipeline(r.data));
        api.get("/crm/reports/sla").then((r) => setSla(r.data));
        api.get("/crm/reports/funnel").then((r) => setFunnel(r.data));
        api.get("/crm/reports/revenue").then((r) => setRevenue(r.data));
        api.get("/crm/reports/doc-rejection-rate").then((r) => setReject(r.data));
    }, []);

    return (
        <div className="p-6">
            <div className="mb-4">
                <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Analytics</div>
                <h1 className="text-xl font-semibold">Reports</h1>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
                <ReportBox title="Pipeline by stage">
                    {pipeline && (
                        <table className="w-full text-sm">
                            <tbody>
                                {Object.entries(pipeline.by_stage).map(([k, v]) => (
                                    <tr key={k} className="border-b border-border last:border-0">
                                        <td className="py-1.5 capitalize">{k.replace(/_/g, " ")}</td>
                                        <td className="text-right font-mono">{v}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </ReportBox>

                <ReportBox title="SLA status">
                    {sla && (
                        <table className="w-full text-sm">
                            <tbody>
                                {Object.entries(sla).map(([k, v]) => (
                                    <tr key={k} className="border-b border-border last:border-0">
                                        <td className="py-1.5 capitalize">{k.replace(/_/g, " ")}</td>
                                        <td className="text-right font-mono">{v}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </ReportBox>

                <ReportBox title="Conversion funnel">
                    {funnel && (
                        <div className="space-y-2 text-sm">
                            <FunnelRow label="Applications (cases)" value={funnel.cases} />
                            <FunnelRow label="Paid" value={funnel.applications_paid} />
                            <FunnelRow label="Approved" value={funnel.approved} />
                            <FunnelRow label="Closed" value={funnel.closed} />
                        </div>
                    )}
                </ReportBox>

                <ReportBox title="Revenue by country">
                    {revenue && (
                        <table className="w-full text-sm">
                            <tbody>
                                {revenue.by_country.map((r) => (
                                    <tr key={r.country_code} className="border-b border-border last:border-0">
                                        <td className="py-1.5 font-mono">{r.country_code}</td>
                                        <td className="py-1.5 font-mono">{r.cases}</td>
                                        <td className="py-1.5 text-right font-mono">{INR.format(r.revenue)}</td>
                                    </tr>
                                ))}
                                <tr className="font-medium bg-surface">
                                    <td className="py-2" colSpan={2}>Total</td>
                                    <td className="py-2 text-right font-mono">{INR.format(revenue.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </ReportBox>

                <ReportBox title="Document rejection rate" className="md:col-span-2">
                    <table className="w-full text-sm">
                        <thead className="border-b border-border">
                            <tr className="text-left text-[10px] font-mono uppercase text-ink-muted">
                                <th className="py-1.5">Doc</th>
                                <th className="py-1.5">Rejected</th>
                                <th className="py-1.5">Total</th>
                                <th className="py-1.5 text-right">Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reject.map((r) => (
                                <tr key={r.doc_key} className="border-b border-border last:border-0">
                                    <td className="py-1.5">{r.doc_name}</td>
                                    <td className="py-1.5 font-mono">{r.rejected}</td>
                                    <td className="py-1.5 font-mono">{r.total}</td>
                                    <td className="py-1.5 text-right font-mono">{r.rejection_rate}%</td>
                                </tr>
                            ))}
                            {reject.length === 0 && <tr><td colSpan={4} className="py-3 text-ink-muted italic">No document data yet.</td></tr>}
                        </tbody>
                    </table>
                </ReportBox>
            </div>
        </div>
    );
}
function ReportBox({ title, children, className = "" }) {
    return (
        <div className={`bg-white border border-border rounded-sm p-4 ${className}`}>
            <div className="text-xs uppercase font-mono text-ink-muted mb-3">{title}</div>
            {children}
        </div>
    );
}
function FunnelRow({ label, value }) {
    return (
        <div className="flex justify-between border-b border-border last:border-0 py-1.5">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    );
}
