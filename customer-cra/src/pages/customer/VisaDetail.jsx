import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { getUser } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { CheckCircle2, Calendar, Shield, FileText } from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function VisaDetail() {
    const { productId } = useParams();
    const nav = useNavigate();
    const [schema, setSchema] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        api.get(`/visa-products/${productId}`)
            .then((r) => setSchema(r.data))
            .catch((e) => setErr(e.response?.status === 404 ? "no-longer-available" : "error"));
    }, [productId]);

    if (err === "no-longer-available") {
        return (
            <div className="max-w-3xl mx-auto px-6 py-24 text-center">
                <Stamp tone="muted" size="lg" className="mx-auto mb-6">No longer available</Stamp>
                <h1 className="font-display text-3xl text-navy mb-3">This visa is no longer offered</h1>
                <p className="text-ink-muted mb-6">Please choose from our current selection.</p>
                <Link to="/" className="text-teal underline" data-testid="back-to-catalog">Back to catalog</Link>
            </div>
        );
    }

    if (!schema) return <div className="max-w-7xl mx-auto p-10 text-ink-muted">Loading…</div>;

    const total = (schema.fees?.govt_fee || 0) + (schema.fees?.service_fee || 0);

    const startApply = () => {
        const user = getUser();
        if (!user) {
            sessionStorage.setItem("vc_next", `/apply/${productId}`);
            nav("/auth");
        } else {
            nav(`/apply/${productId}`);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">
            <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-6 inline-block" data-testid="detail-back">← All visas</Link>

            <div className="grid md:grid-cols-3 gap-10">
                {/* Left column */}
                <div className="md:col-span-2 space-y-8">
                    <div className="relative rounded-xl overflow-hidden">
                        <img src={schema.banner_image_url} alt={schema.country_name} className="w-full h-72 object-cover" />
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full">
                            <span className="text-xl leading-none">{schema.country_flag}</span>
                            <span className="font-medium text-sm text-ink">{schema.country_name}</span>
                        </div>
                    </div>

                    <div>
                        <h1 className="font-display text-4xl text-navy leading-tight mb-3">{schema.title}</h1>
                        <p className="text-ink-muted">For Indian passport holders. A dedicated consultant reviews your documents and files your application at the {schema.country_name} embassy or consulate.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Metric label="Processing" value={`${schema.processing_time_days} days`} icon={<Calendar className="w-4 h-4" />} />
                        <Metric label="Validity" value={`${schema.validity_days} days`} icon={<Shield className="w-4 h-4" />} />
                        <Metric label="Visa type" value={schema.visa_type} icon={<FileText className="w-4 h-4" />} />
                    </div>

                    <div>
                        <h2 className="font-display text-2xl text-navy mb-4">What you'll need</h2>
                        <ul className="space-y-3">
                            {schema.documents.map((d) => (
                                <li key={d.doc_key} className="flex items-start gap-3 p-4 bg-white border border-border rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-ink">{d.name}</span>
                                            {!d.required && <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Optional</span>}
                                        </div>
                                        {d.description && <p className="text-sm text-ink-muted mt-1">{d.description}</p>}
                                        <p className="text-xs text-ink-muted mt-1 font-mono">{d.formats.join(", ").toUpperCase()} · up to {d.max_size_mb}MB</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Sticky summary */}
                <aside className="md:sticky md:top-24 md:self-start">
                    <div className="bg-white border border-border rounded-xl p-6 shadow-card">
                        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">Fees breakdown</div>
                        <div className="space-y-2 py-4 border-b border-border">
                            <FeeRow label="Government fee" amount={schema.fees?.govt_fee} />
                            <FeeRow label="Service fee" amount={schema.fees?.service_fee} />
                        </div>
                        <div className="flex items-center justify-between py-4 border-b border-border">
                            <span className="font-medium">Total</span>
                            <span className="font-display text-2xl text-navy">{INR.format(total)}</span>
                        </div>
                        <button onClick={startApply} data-testid="apply-now" className="w-full mt-5 py-3 bg-navy text-white rounded-full font-medium hover:bg-navy-hover transition-colors">
                            Apply now
                        </button>
                        <div className="mt-4 text-center">
                            <Stamp tone="gold" size="sm">Guaranteed processing</Stamp>
                        </div>
                        <p className="text-xs text-ink-muted mt-4 leading-relaxed text-center">A real consultant will contact you within 24 hours of application.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function Metric({ label, value, icon }) {
    return (
        <div className="p-4 bg-white border border-border rounded-xl">
            <div className="flex items-center gap-1.5 text-ink-muted text-[10px] uppercase font-mono tracking-widest mb-1">{icon}{label}</div>
            <div className="font-display text-xl text-navy capitalize">{value}</div>
        </div>
    );
}
function FeeRow({ label, amount }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-ink-muted">{label}</span>
            <span className="font-mono text-ink">{INR.format(amount || 0)}</span>
        </div>
    );
}
