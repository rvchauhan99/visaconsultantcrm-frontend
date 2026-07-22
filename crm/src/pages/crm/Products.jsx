import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Plus } from "lucide-react";

const VISA_TYPES = ["tourist", "business", "transit", "other_general"];

export default function Products() {
    const [products, setProducts] = useState([]);
    const [countries, setCountries] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const nav = useNavigate();

    useEffect(() => {
        load();
        api.get("/visa-products/countries").then((r) => setCountries(r.data));
    }, []);
    const load = () => api.get("/admin/visa-products").then((r) => setProducts(r.data));

    const createProduct = async (form) => {
        try {
            const r = await api.post("/admin/visa-products", form);
            toast.success("Product created");
            setShowNew(false);
            nav(`/products/${r.data.id}`);
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Admin</div>
                    <h1 className="text-xl font-semibold">Visa products</h1>
                </div>
                <button onClick={() => setShowNew(true)} data-testid="new-product-btn" className="inline-flex items-center gap-1.5 bg-navy text-white text-sm px-3 py-1.5 rounded-sm hover:bg-navy-hover">
                    <Plus className="w-4 h-4" /> New product
                </button>
            </div>

            {showNew && <NewProductForm countries={countries} onCancel={() => setShowNew(false)} onCreate={createProduct} />}

            <div className="bg-white border border-border rounded-sm">
                <table className="w-full text-sm">
                    <thead className="bg-surface border-b border-border">
                        <tr className="text-left">
                            <th className="px-3 py-2 text-xs uppercase font-mono">Country</th>
                            <th className="px-3 py-2 text-xs uppercase font-mono">Title</th>
                            <th className="px-3 py-2 text-xs uppercase font-mono">Type</th>
                            <th className="px-3 py-2 text-xs uppercase font-mono">Docs / Fields</th>
                            <th className="px-3 py-2 text-xs uppercase font-mono">Processing</th>
                            <th className="px-3 py-2 text-xs uppercase font-mono">Status</th>
                        </tr>
                    </thead>
                    <tbody data-testid="products-table">
                        {products.map((p) => (
                            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface cursor-pointer" onClick={() => nav(`/products/${p.id}`)} data-testid={`product-row-${p.country_code}`}>
                                <td className="px-3 py-2">{p.country_flag} {p.country_name}</td>
                                <td className="px-3 py-2 font-medium">{p.title}</td>
                                <td className="px-3 py-2 font-mono text-xs">{p.visa_type}</td>
                                <td className="px-3 py-2 font-mono text-xs">{p.required_documents_count} / {p.fields_count}</td>
                                <td className="px-3 py-2 font-mono text-xs">{p.processing_time_days}d</td>
                                <td className="px-3 py-2"><Stamp tone={p.status === "published" ? "success" : "muted"} size="sm">{p.status}</Stamp></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function NewProductForm({ countries, onCancel, onCreate }) {
    const [country, setCountry] = useState("");
    const [visaType, setVisaType] = useState("tourist");
    const [title, setTitle] = useState("");
    const [validity, setValidity] = useState(60);
    const [processing, setProcessing] = useState(7);
    const [banner, setBanner] = useState("");

    const submit = (e) => {
        e.preventDefault();
        const c = countries.find((x) => x.code === country);
        if (!c) return;
        onCreate({
            country_code: country, country_name: c.name, visa_type: visaType,
            title, validity_days: Number(validity), processing_time_days: Number(processing),
            banner_image_url: banner || null,
        });
    };

    return (
        <form onSubmit={submit} className="bg-white border border-border rounded-sm p-4 mb-4 grid md:grid-cols-3 gap-3" data-testid="new-product-form">
            <label className="text-sm">
                <span className="text-xs text-ink-muted block mb-1">Country</span>
                <select required className={inp} value={country} onChange={(e) => setCountry(e.target.value)} data-testid="np-country">
                    <option value="">Select…</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
            </label>
            <label className="text-sm">
                <span className="text-xs text-ink-muted block mb-1">Visa type</span>
                <select className={inp} value={visaType} onChange={(e) => setVisaType(e.target.value)} data-testid="np-type">
                    {VISA_TYPES.map((v) => <option key={v}>{v}</option>)}
                </select>
                <span className="text-[10px] text-ink-muted mt-0.5 block">Note: student visas are excluded platform-wide.</span>
            </label>
            <label className="text-sm">
                <span className="text-xs text-ink-muted block mb-1">Title</span>
                <input required className={inp} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="np-title" placeholder="e.g. USA Tourist Visa" />
            </label>
            <label className="text-sm">
                <span className="text-xs text-ink-muted block mb-1">Validity (days)</span>
                <input type="number" required className={inp} value={validity} onChange={(e) => setValidity(e.target.value)} data-testid="np-validity" />
            </label>
            <label className="text-sm">
                <span className="text-xs text-ink-muted block mb-1">Processing (days)</span>
                <input type="number" required className={inp} value={processing} onChange={(e) => setProcessing(e.target.value)} data-testid="np-processing" />
            </label>
            <label className="text-sm">
                <span className="text-xs text-ink-muted block mb-1">Banner image URL (optional)</span>
                <input className={inp} value={banner} onChange={(e) => setBanner(e.target.value)} data-testid="np-banner" />
            </label>
            <div className="md:col-span-3 flex gap-2 justify-end">
                <button type="button" onClick={onCancel} className="text-sm px-3 py-1.5 border border-border rounded-sm">Cancel</button>
                <button type="submit" className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="np-submit">Create draft</button>
            </div>
        </form>
    );
}
const inp = "w-full h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
