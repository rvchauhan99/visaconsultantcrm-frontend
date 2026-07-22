import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2, Upload } from "lucide-react";

export default function OfflineCase() {
    const [products, setProducts] = useState([]);
    const [productId, setProductId] = useState("");
    const [schema, setSchema] = useState(null);
    const [customer, setCustomer] = useState({ email: "", full_name: "", phone: "" });
    const [traveler, setTraveler] = useState({});
    const [fields, setFields] = useState({});
    const [uploads, setUploads] = useState({});
    const [payment, setPayment] = useState({ status: "pending", method: "", reference: "" });
    const [busy, setBusy] = useState(false);
    const nav = useNavigate();

    useEffect(() => {
        api.get("/visa-products").then((r) => setProducts(r.data));
    }, []);

    useEffect(() => {
        if (!productId) return setSchema(null);
        api.get(`/visa-products/${productId}`).then((r) => setSchema(r.data));
    }, [productId]);

    const uploadDoc = async (docKey, file) => {
        const form = new FormData();
        form.append("file", file);
        const res = await api.post("/documents/staff-upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        setUploads((u) => ({ ...u, [docKey]: res.data }));
        toast.success(`${docKey} uploaded`);
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const body = {
                visa_product_id: productId,
                customer_email: customer.email,
                customer_full_name: customer.full_name,
                customer_phone: customer.phone,
                traveler,
                field_values: fields,
                document_uploads: Object.entries(uploads).map(([k, v]) => ({ doc_key: k, file_url: v.file_url, filename: v.filename })),
                payment_status: payment.status,
                payment_method: payment.method || null,
                payment_reference: payment.reference || null,
            };
            const r = await api.post("/crm/cases", body);
            toast.success("Offline case created");
            nav(`/crm/cases/${r.data.case_id}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="p-6 max-w-3xl">
            <div className="mb-4">
                <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">New case</div>
                <h1 className="text-xl font-semibold">Offline case creation</h1>
                <p className="text-xs text-ink-muted mt-1">For customers walking in or applying over the phone. Same snapshot rules apply.</p>
            </div>

            <Section title="Visa product">
                <select required className={inp} value={productId} onChange={(e) => setProductId(e.target.value)} data-testid="oc-product">
                    <option value="">Select a visa product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.country_flag} {p.title}</option>)}
                </select>
            </Section>

            <Section title="Customer">
                <div className="grid grid-cols-2 gap-3">
                    <F label="Full name"><input required className={inp} value={customer.full_name} onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })} data-testid="oc-name" /></F>
                    <F label="Email"><input type="email" required className={inp} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} data-testid="oc-email" /></F>
                    <F label="Phone"><input className={inp} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} data-testid="oc-phone" /></F>
                </div>
            </Section>

            {schema && (
                <>
                    <Section title="Traveler passport info">
                        <div className="grid grid-cols-2 gap-3">
                            <F label="Passport number"><input className={inp} value={traveler.passport_number || ""} onChange={(e) => setTraveler({ ...traveler, passport_number: e.target.value.toUpperCase() })} data-testid="oc-passport" /></F>
                            <F label="Passport expiry"><input type="date" className={inp} value={traveler.passport_expiry_date || ""} onChange={(e) => setTraveler({ ...traveler, passport_expiry_date: e.target.value })} data-testid="oc-expiry" /></F>
                            <F label="Date of birth"><input type="date" className={inp} value={traveler.dob || ""} onChange={(e) => setTraveler({ ...traveler, dob: e.target.value })} /></F>
                        </div>
                    </Section>

                    {schema.fields.length > 0 && (
                        <Section title="Dynamic fields">
                            <div className="grid grid-cols-2 gap-3">
                                {schema.fields.map((f) => (
                                    <F key={f.field_key} label={f.label}>
                                        {f.type === "dropdown" ? (
                                            <select className={inp} value={fields[f.field_key] || ""} onChange={(e) => setFields({ ...fields, [f.field_key]: e.target.value })}>
                                                <option value="">—</option>
                                                {(f.options || []).map((o) => <option key={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input type={f.type === "date" ? "date" : "text"} className={inp} value={fields[f.field_key] || ""} onChange={(e) => setFields({ ...fields, [f.field_key]: e.target.value })} />
                                        )}
                                    </F>
                                ))}
                            </div>
                        </Section>
                    )}

                    <Section title="Documents">
                        <div className="space-y-2">
                            {schema.documents.map((d) => (
                                <div key={d.doc_key} className="flex items-center justify-between bg-surface border border-border rounded-sm p-2.5 text-sm">
                                    <div>
                                        <div className="font-medium">{d.name} {!d.required && <span className="text-[10px] font-mono uppercase text-ink-muted ml-1">optional</span>}</div>
                                        <div className="text-[10px] font-mono uppercase text-ink-muted">{d.formats.join(", ")} · max {d.max_size_mb}MB</div>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 border border-ink px-2.5 py-1 rounded-sm text-xs hover:bg-ink hover:text-white">
                                        <Upload className="w-3 h-3" />
                                        {uploads[d.doc_key] ? "Replace" : "Upload"}
                                        <input hidden type="file" onChange={(e) => e.target.files?.[0] && uploadDoc(d.doc_key, e.target.files[0])} data-testid={`oc-upload-${d.doc_key}`} />
                                    </label>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Payment">
                        <div className="grid grid-cols-3 gap-3">
                            <F label="Status">
                                <select className={inp} value={payment.status} onChange={(e) => setPayment({ ...payment, status: e.target.value })} data-testid="oc-pay-status">
                                    <option value="pending">pending</option>
                                    <option value="paid">paid</option>
                                </select>
                            </F>
                            <F label="Method"><input className={inp} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} placeholder="cash / bank transfer" data-testid="oc-pay-method" /></F>
                            <F label="Reference"><input className={inp} value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} data-testid="oc-pay-ref" /></F>
                        </div>
                    </Section>
                </>
            )}

            <div className="flex justify-end">
                <button type="submit" disabled={busy || !productId} className="bg-navy text-white px-4 py-2 rounded-sm text-sm hover:bg-navy-hover disabled:opacity-50 flex items-center gap-2" data-testid="oc-submit">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create case
                </button>
            </div>
        </form>
    );
}

function Section({ title, children }) {
    return (
        <div className="bg-white border border-border rounded-sm p-4 mb-3">
            <div className="text-xs uppercase font-mono text-ink-muted mb-2">{title}</div>
            {children}
        </div>
    );
}
function F({ label, children }) {
    return (
        <label className="block text-sm">
            <span className="text-xs text-ink-muted block mb-1">{label}</span>
            {children}
        </label>
    );
}
const inp = "w-full h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
