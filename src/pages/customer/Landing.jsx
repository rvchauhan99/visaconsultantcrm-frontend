import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Search, Zap, FileText, Calendar, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";

const FEE_FMT = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function guaranteedByText(processingDays) {
    const d = new Date();
    d.setDate(d.getDate() + processingDays + 2);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Landing() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [visaType, setVisaType] = useState("");
    const [delivery, setDelivery] = useState("any");

    useEffect(() => {
        api.get("/visa-products").then((r) => {
            setProducts(r.data);
            setLoading(false);
        });
    }, []);

    const filtered = useMemo(() => {
        return products.filter((p) => {
            if (q && !p.country_name.toLowerCase().includes(q.toLowerCase()) && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
            if (visaType && p.visa_type !== visaType) return false;
            if (delivery === "fast" && p.processing_time_days > 7) return false;
            return true;
        });
    }, [products, q, visaType, delivery]);

    return (
        <div>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 md:px-10 pt-14 md:pt-20 pb-10 grid md:grid-cols-2 gap-10 items-center">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-teal mb-4 font-medium">For Indian passport holders</p>
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-navy mb-5">
                            Visas without the guesswork.
                        </h1>
                        <p className="text-lg text-ink-muted max-w-lg mb-8 leading-relaxed">
                            A real consultant reviews your documents, files your application, and updates you at every stamp.
                            Fees shown up front. No surprises.
                        </p>
                        <div className="flex flex-wrap gap-3 items-center text-sm text-ink-muted">
                            <Stamp tone="gold" size="sm">Guaranteed by</Stamp>
                            <span>on-time filing or your service fee back.</span>
                        </div>
                    </div>
                    <div className="relative">
                        <img
                            src="https://images.unsplash.com/photo-1742327648952-5babf1d04ae4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000"
                            alt="Travel documents"
                            className="w-full h-[380px] md:h-[440px] object-cover rounded-xl"
                        />
                        <div className="absolute -bottom-4 -left-4 bg-white border border-border rounded-xl px-4 py-3 shadow-card">
                            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Trusted since</div>
                            <div className="font-display text-2xl text-navy">2019</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="max-w-7xl mx-auto px-6 md:px-10">
                <div className="bg-white border border-border rounded-xl p-4 md:p-5 flex flex-wrap gap-3 items-center shadow-card">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] border-r border-border pr-3">
                        <Search className="w-4 h-4 text-ink-muted" />
                        <input
                            data-testid="catalog-search"
                            placeholder="Search a country…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
                        />
                    </div>
                    <FilterPill icon={<Zap className="w-3.5 h-3.5" />} label="Delivery" options={[["any", "Any speed"], ["fast", "Fast-track (≤7 days)"]]} value={delivery} onChange={setDelivery} testid="filter-delivery" />
                    <FilterPill icon={<FileText className="w-3.5 h-3.5" />} label="Visa type" options={[["", "All types"], ["tourist", "Tourist"], ["business", "Business"], ["transit", "Transit"]]} value={visaType} onChange={setVisaType} testid="filter-type" />
                </div>
            </section>

            {/* Catalog grid */}
            <section className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-24">
                <div className="flex items-baseline justify-between mb-5">
                    <h2 className="font-display text-2xl text-navy">Choose your destination</h2>
                    <span className="text-sm text-ink-muted font-mono">{filtered.length} visas</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="rounded-xl bg-white border border-border h-[340px] animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyCatalog />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="catalog-grid">
                        {filtered.map((p) => (
                            <VisaCard key={p.id} product={p} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function FilterPill({ icon, label, options, value, onChange, testid }) {
    return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
            <span className="text-ink-muted">{icon}</span>
            <span className="text-ink-muted mr-1">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                data-testid={testid}
                className="bg-transparent outline-none text-ink font-medium border-none cursor-pointer"
            >
                {options.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                ))}
            </select>
        </label>
    );
}

function VisaCard({ product }) {
    const totalFee = (product.fees?.govt_fee || 0) + (product.fees?.service_fee || 0);
    return (
        <Link
            to={`/visa/${product.id}`}
            data-testid={`visa-card-${product.country_code}`}
            className="group block bg-white border border-border rounded-xl overflow-hidden hover:shadow-card transition-shadow"
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                <img
                    src={product.banner_image_url || "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800"}
                    alt={product.country_name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <div className="absolute top-3 right-3">
                    <Stamp tone="gold" size="sm" className="bg-white/90 backdrop-blur">By {guaranteedByText(product.processing_time_days)}</Stamp>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs">
                    <span className="text-lg leading-none">{product.country_flag}</span>
                    <span className="font-medium text-ink">{product.country_name}</span>
                </div>
            </div>
            <div className="p-5">
                <h3 className="font-display text-xl text-navy leading-tight mb-2">{product.title}</h3>
                <div className="flex items-center gap-4 text-xs text-ink-muted mb-4 font-mono uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{product.processing_time_days}d process</span>
                    <span>·</span>
                    <span>{product.validity_days}d validity</span>
                </div>
                <div className="flex items-end justify-between pt-4 border-t border-border">
                    <div>
                        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">From</div>
                        <div className="font-display text-2xl text-ink">{FEE_FMT.format(totalFee)}</div>
                    </div>
                    <span className="text-sm text-teal group-hover:underline">Apply →</span>
                </div>
            </div>
        </Link>
    );
}

function EmptyCatalog() {
    return (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <ShieldCheck className="w-8 h-8 mx-auto text-ink-muted mb-3" />
            <p className="text-ink font-medium mb-1">No visas match those filters yet.</p>
            <p className="text-sm text-ink-muted">Try clearing them to see what's available.</p>
        </div>
    );
}
