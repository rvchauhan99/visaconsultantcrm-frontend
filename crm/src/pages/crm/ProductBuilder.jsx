import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { resolveFileUrl } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ArrowUp, ArrowDown, Check, X, Pencil, Upload, Loader2 } from "lucide-react";
import { CountrySelect, MasterSelect, SearchableSelect } from "@/components/forms/selects";
import { DEFAULT_GST_PERCENT, FEE_LABELS, computeLineTotal } from "@/lib/productPricing";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function ProductBuilder() {
    const { productId } = useParams();
    const nav = useNavigate();
    const [schema, setSchema] = useState(null);

    const load = useCallback(() => {
        return api.get(`/admin/visa-products/${productId}`).then((r) => setSchema(r.data));
    }, [productId]);

    useEffect(() => {
        load();
    }, [load]);

    if (!schema) return <div className="p-6 text-ink-muted">Loading…</div>;

    const publish = async () => {
        try {
            await api.patch(`/admin/visa-products/${productId}/publish`);
            toast.success("Published");
            load();
        } catch (e) {
            const errors = e.response?.data?.detail?.errors || [e.response?.data?.detail || "Cannot publish"];
            toast.error((Array.isArray(errors) ? errors.join(" · ") : errors));
        }
    };
    const unpublish = async () => {
        await api.patch(`/admin/visa-products/${productId}/unpublish`);
        toast.success("Unpublished");
        load();
    };

    return (
        <div className="p-6">
            <Link to="/products" className="text-xs text-ink-muted hover:text-ink font-mono mb-3 inline-block">← Products</Link>

            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-semibold">{schema.title}</h1>
                    <div className="text-xs font-mono uppercase tracking-widest text-ink-muted">{schema.country_flag} {schema.country_name} · {schema.visa_type}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Stamp tone={schema.status === "published" ? "success" : "muted"} size="sm">{schema.status}</Stamp>
                    {schema.status === "published"
                        ? <button onClick={unpublish} className="text-sm px-3 py-1.5 border border-border rounded-sm hover:bg-surface" data-testid="unpublish-btn">Unpublish</button>
                        : <button onClick={publish} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="publish-btn">Publish</button>}
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-4">
                <Tabs defaultValue="basic">
                    <TabsList className="bg-surface-card border border-border rounded-sm h-auto p-0.5">
                        {["basic", "documents", "fields", "pricing"].map((t) => (
                            <TabsTrigger key={t} value={t} className="text-xs uppercase font-mono tracking-widest px-3 py-1.5 rounded-sm data-[state=active]:bg-navy data-[state=active]:text-white" data-testid={`pb-tab-${t}`}>{t}</TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="basic">
                        <BasicTab schema={schema} reload={load} />
                    </TabsContent>
                    <TabsContent value="documents">
                        <DocsTab schema={schema} reload={load} />
                    </TabsContent>
                    <TabsContent value="fields">
                        <FieldsTab schema={schema} reload={load} />
                    </TabsContent>
                    <TabsContent value="pricing">
                        <PricingTab schema={schema} reload={load} />
                    </TabsContent>
                </Tabs>

                {/* Live preview */}
                <aside className="bg-surface border border-border rounded-sm p-3">
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">Customer preview</div>
                    <CustomerPreviewCard schema={schema} />
                </aside>
            </div>
        </div>
    );
}

function BasicTab({ schema, reload }) {
    const [form, setForm] = useState({
        country_code: schema.country_code, country_name: schema.country_name,
        visa_type: schema.visa_type, title: schema.title,
        banner_image_url: schema.banner_image_url || "",
        validity_days: schema.validity_days, processing_time_days: schema.processing_time_days,
        passport_min_validity_months: schema.passport_min_validity_months ?? 6,
    });
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const bannerFileRef = useRef(null);

    const save = async () => {
        try {
            await api.patch(`/admin/visa-products/${schema.visa_product_id}`, form);
            toast.success("Saved");
            reload();
        } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    };

    const uploadBanner = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingBanner(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await api.post("/documents/staff-upload", fd);
            setForm((f) => ({ ...f, banner_image_url: r.data.file_url }));
            toast.success("Banner uploaded — click Save changes to apply");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Upload failed");
        } finally {
            setUploadingBanner(false);
            if (bannerFileRef.current) bannerFileRef.current.value = "";
        }
    };

    return (
        <div className="bg-surface-card border border-border rounded-sm p-4 mt-3 space-y-3" data-testid="basic-tab">
            <div className="grid grid-cols-2 gap-3">
                <F label="Title"><input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="basic-title" /></F>
                <F label="Country">
                    <CountrySelect
                        value={form.country_code}
                        onChange={(code, opt) => setForm({
                            ...form,
                            country_code: code,
                            country_name: opt?.name || form.country_name,
                        })}
                        testId="basic-country"
                    />
                </F>
                <F label="Visa type">
                    <SearchableSelect
                        clearable={false}
                        value={form.visa_type}
                        onChange={(v) => setForm({ ...form, visa_type: v || "tourist" })}
                        options={["tourist", "business", "transit", "other_general"].map((v) => ({ value: v, label: v }))}
                    />
                </F>
                <F label="Validity (days)"><input type="number" className={inp} value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: Number(e.target.value) })} /></F>
                <F label="Processing (days)"><input type="number" className={inp} value={form.processing_time_days} onChange={(e) => setForm({ ...form, processing_time_days: Number(e.target.value) })} /></F>
                <F label="Passport min. validity (months)"><input type="number" className={inp} value={form.passport_min_validity_months} onChange={(e) => setForm({ ...form, passport_min_validity_months: Number(e.target.value) })} data-testid="basic-passport-validity" /></F>
                <F label="Banner image URL">
                    <div className="flex items-center gap-1.5">
                        <input className={inp} value={form.banner_image_url} onChange={(e) => setForm({ ...form, banner_image_url: e.target.value })} data-testid="basic-banner-url" />
                        <label className="shrink-0 h-8 w-8 flex items-center justify-center border border-border rounded-sm cursor-pointer hover:bg-surface text-ink-muted" title="Upload banner image">
                            {uploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={uploadBanner} data-testid="basic-banner-upload" />
                        </label>
                    </div>
                </F>
            </div>
            {form.banner_image_url && (
                <img src={resolveFileUrl(form.banner_image_url)} alt="Banner preview" className="h-24 rounded-sm border border-border object-cover" />
            )}
            <div className="flex justify-end"><button onClick={save} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="basic-save">Save changes</button></div>
        </div>
    );
}

function DocsTab({ schema, reload }) {
    const [n, setN] = useState({
        doc_key: "",
        doc_name: "",
        description: "",
        required: true,
        formats_allowed: ["pdf"],
        max_file_size_mb: 5,
        display_order: (schema.documents.length + 1),
    });

    const attached = new Set(schema.documents.map((d) => d.doc_key));

    const pickMaster = (docKey, m) => {
        if (!docKey || !m) {
            setN((prev) => ({ ...prev, doc_key: "" }));
            return;
        }
        if (attached.has(docKey)) {
            toast.error("Already on this product");
            return;
        }
        setN({
            doc_key: m.doc_key,
            doc_name: m.default_name,
            description: m.default_description || "",
            required: m.default_required !== false,
            formats_allowed: m.default_formats_allowed || ["pdf"],
            max_file_size_mb: m.default_max_file_size_mb || 5,
            display_order: schema.documents.length + 1,
        });
    };

    const add = async () => {
        if (!n.doc_key || !n.doc_name) return toast.error("Select a document from the master list");
        try {
            await api.post(`/admin/visa-products/${schema.visa_product_id}/documents`, n);
            toast.success("Document added");
            setN({
                doc_key: "",
                doc_name: "",
                description: "",
                required: true,
                formats_allowed: ["pdf"],
                max_file_size_mb: 5,
                display_order: n.display_order + 1,
            });
            reload();
        } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    };

    const del = async (doc) => {
        if (!doc.id) return toast.error("Missing document id — reload and try again");
        if (!window.confirm(`Remove ${doc.name} from this product?`)) return;
        try {
            await api.delete(`/admin/visa-products/${schema.visa_product_id}/documents/${doc.id}`);
            toast.success("Removed");
            reload();
        } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    };

    const move = async (idx, dir) => {
        const items = schema.documents;
        const otherIdx = idx + dir;
        if (otherIdx < 0 || otherIdx >= items.length) return;
        const a = items[idx], b = items[otherIdx];
        if (!a.id || !b.id) return toast.error("Missing document id — reload and try again");
        try {
            await api.post(`/admin/visa-products/${schema.visa_product_id}/documents/reorder`, [
                { id: a.id, display_order: b.order },
                { id: b.id, display_order: a.order },
            ]);
            reload();
        } catch (e) { toast.error("Failed to reorder"); }
    };

    return (
        <div className="bg-surface-card border border-border rounded-sm p-4 mt-3" data-testid="docs-tab">
            <table className="w-full text-sm mb-4">
                <thead className="bg-surface border-b border-border">
                    <tr>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Order</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Key</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Name</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Required</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Formats</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Max MB</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Sample</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase"></th>
                    </tr>
                </thead>
                <tbody>
                    {schema.documents.map((d, idx) => (
                        <tr key={d.doc_key} className="border-b border-border last:border-0">
                            <td className="px-2 py-1.5">
                                <div className="flex items-center gap-0.5">
                                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-0.5 text-ink-muted hover:text-navy disabled:opacity-30" data-testid={`doc-up-${d.doc_key}`}><ArrowUp className="w-3 h-3" /></button>
                                    <button onClick={() => move(idx, 1)} disabled={idx === schema.documents.length - 1} className="p-0.5 text-ink-muted hover:text-navy disabled:opacity-30" data-testid={`doc-down-${d.doc_key}`}><ArrowDown className="w-3 h-3" /></button>
                                </div>
                            </td>
                            <td className="px-2 py-1.5 font-mono text-xs">{d.doc_key}</td>
                            <td className="px-2 py-1.5">{d.name}</td>
                            <td className="px-2 py-1.5">{d.required ? "yes" : "no"}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{(d.formats || []).join(", ")}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{d.max_size_mb}</td>
                            <td className="px-2 py-1.5"><SampleFileCell doc={d} productId={schema.visa_product_id} reload={reload} /></td>
                            <td className="px-2 py-1.5 text-right">
                                <button onClick={() => del(d)} className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1" data-testid={`del-doc-${d.doc_key}`}>
                                    <Trash2 className="w-3 h-3" /> Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                    {schema.documents.length === 0 && <tr><td colSpan={8} className="px-2 py-3 text-ink-muted italic">No documents yet.</td></tr>}
                </tbody>
            </table>

            <div className="border-t border-border pt-3">
                <div className="text-xs uppercase font-mono text-ink-muted mb-2">Add from Document Master</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <MasterSelect
                        kind="document"
                        value={n.doc_key || null}
                        onChange={pickMaster}
                        testId="new-doc-key"
                    />
                    <input className={inp} placeholder="Display name" value={n.doc_name} onChange={(e) => setN({ ...n, doc_name: e.target.value })} data-testid="new-doc-name" disabled={!n.doc_key} />
                    <label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={n.required} onChange={(e) => setN({ ...n, required: e.target.checked })} data-testid="new-doc-required" disabled={!n.doc_key} /> Required</label>
                    <input className={inp + " col-span-2"} placeholder="Description" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} disabled={!n.doc_key} />
                    <input className={inp} type="number" placeholder="Max MB" value={n.max_file_size_mb} onChange={(e) => setN({ ...n, max_file_size_mb: Number(e.target.value) })} disabled={!n.doc_key} />
                </div>
                <button onClick={add} disabled={!n.doc_key} className="mt-2 text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover disabled:opacity-40" data-testid="add-doc-btn">Add document</button>
            </div>
        </div>
    );
}

function SampleFileCell({ doc, productId, reload }) {
    const [editing, setEditing] = useState(false);
    const [url, setUrl] = useState(doc.sample_file_url || "");
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    if (!doc.id) return <span className="text-ink-muted italic text-xs">—</span>;

    const save = async (newUrl) => {
        try {
            await api.patch(`/admin/visa-products/${productId}/documents/${doc.id}`, { doc_key: doc.doc_key, sample_file_url: newUrl || null });
            toast.success("Sample updated");
            setEditing(false);
            reload();
        } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    };

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await api.post("/documents/staff-upload", fd);
            setUrl(r.data.file_url);
            await save(r.data.file_url);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Upload failed");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    if (editing) {
        return (
            <div className="flex items-center gap-1" data-testid={`doc-sample-edit-${doc.doc_key}`}>
                <input className={inp + " w-32 h-7 text-xs"} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
                <button onClick={() => save(url)} className="p-1 border border-success text-success rounded-sm hover:bg-success hover:text-white"><Check className="w-3 h-3" /></button>
                <button onClick={() => { setUrl(doc.sample_file_url || ""); setEditing(false); }} className="p-1 border border-border text-ink-muted rounded-sm hover:bg-surface"><X className="w-3 h-3" /></button>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5" data-testid={`doc-sample-${doc.doc_key}`}>
            {doc.sample_file_url
                ? <a href={resolveFileUrl(doc.sample_file_url)} target="_blank" rel="noreferrer" className="text-teal underline text-xs font-mono truncate max-w-[90px]">sample</a>
                : <span className="text-ink-muted italic text-xs">none</span>}
            <button onClick={() => setEditing(true)} className="text-ink-muted hover:text-navy" title="Set sample URL" data-testid={`doc-sample-edit-btn-${doc.doc_key}`}>
                <Pencil className="w-3 h-3" />
            </button>
            <label className="text-ink-muted hover:text-navy cursor-pointer" title="Upload sample file">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <input ref={fileRef} type="file" className="hidden" onChange={upload} data-testid={`doc-sample-upload-${doc.doc_key}`} />
            </label>
        </div>
    );
}

function FieldsTab({ schema, reload }) {
    const [n, setN] = useState({
        field_key: "",
        label: "",
        field_type: "text",
        required: true,
        options: "",
        display_order: (schema.fields.length + 1),
    });

    const attached = new Set(schema.fields.map((f) => f.field_key));

    const pickMaster = (fieldKey, m) => {
        if (!fieldKey || !m) {
            setN((prev) => ({ ...prev, field_key: "" }));
            return;
        }
        if (attached.has(fieldKey)) {
            toast.error("Already on this product");
            return;
        }
        setN({
            field_key: m.field_key,
            label: m.default_label,
            field_type: m.default_field_type || "text",
            required: m.default_required !== false,
            options: (m.default_options || []).join(", "),
            display_order: schema.fields.length + 1,
        });
    };

    const add = async () => {
        if (!n.field_key || !n.label) return toast.error("Select a field from the master list");
        const body = {
            field_key: n.field_key,
            label: n.label,
            field_type: n.field_type,
            required: n.required,
            display_order: n.display_order,
        };
        if (n.field_type === "dropdown") {
            body.options = n.options.split(",").map((s) => s.trim()).filter(Boolean);
        }
        try {
            await api.post(`/admin/visa-products/${schema.visa_product_id}/fields`, body);
            toast.success("Field added");
            setN({
                field_key: "",
                label: "",
                field_type: "text",
                required: true,
                options: "",
                display_order: n.display_order + 1,
            });
            reload();
        } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    };

    const del = async (f) => {
        if (!f.id) return toast.error("Missing field id — reload and try again");
        if (!window.confirm(`Remove ${f.label} from this product?`)) return;
        try {
            await api.delete(`/admin/visa-products/${schema.visa_product_id}/fields/${f.id}`);
            toast.success("Removed");
            reload();
        } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    };

    return (
        <div className="bg-surface-card border border-border rounded-sm p-4 mt-3" data-testid="fields-tab">
            <table className="w-full text-sm mb-4">
                <thead className="bg-surface border-b border-border">
                    <tr>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Key</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Label</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Type</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Required</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase">Options</th>
                        <th className="text-left px-2 py-1.5 text-xs font-mono uppercase"></th>
                    </tr>
                </thead>
                <tbody>
                    {schema.fields.map((f) => (
                        <tr key={f.field_key} className="border-b border-border last:border-0">
                            <td className="px-2 py-1.5 font-mono text-xs">{f.field_key}</td>
                            <td className="px-2 py-1.5">{f.label}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{f.type}</td>
                            <td className="px-2 py-1.5">{f.required ? "yes" : "no"}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{(f.options || []).join(", ")}</td>
                            <td className="px-2 py-1.5 text-right">
                                <button onClick={() => del(f)} className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1" data-testid={`del-field-${f.field_key}`}>
                                    <Trash2 className="w-3 h-3" /> Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                    {schema.fields.length === 0 && <tr><td colSpan={6} className="px-2 py-3 text-ink-muted italic">No custom fields.</td></tr>}
                </tbody>
            </table>

            <div className="border-t border-border pt-3">
                <div className="text-xs uppercase font-mono text-ink-muted mb-2">Add from Field Master</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <MasterSelect
                        kind="field"
                        value={n.field_key || null}
                        onChange={pickMaster}
                        testId="new-field-key"
                    />
                    <input className={inp} placeholder="Label" value={n.label} onChange={(e) => setN({ ...n, label: e.target.value })} data-testid="new-field-label" disabled={!n.field_key} />
                    <SearchableSelect
                        clearable={false}
                        value={n.field_type}
                        onChange={(v) => setN({ ...n, field_type: v || "text" })}
                        data-testid="new-field-type"
                        disabled={!n.field_key}
                        options={["text", "date", "dropdown", "number"].map((t) => ({ value: t, label: t }))}
                    />
                    <label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={n.required} onChange={(e) => setN({ ...n, required: e.target.checked })} disabled={!n.field_key} /> Required</label>
                    {n.field_type === "dropdown" && <input className={inp + " col-span-2"} placeholder="Options (comma separated)" value={n.options} onChange={(e) => setN({ ...n, options: e.target.value })} data-testid="new-field-options" disabled={!n.field_key} />}
                </div>
                <button onClick={add} disabled={!n.field_key} className="mt-2 text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover disabled:opacity-40" data-testid="add-field-btn">Add field</button>
            </div>
        </div>
    );
}

function PricingTab({ schema, reload }) {
    const [gov, setGov] = useState(schema.fees?.govt_fee || 0);
    const [srv, setSrv] = useState(schema.fees?.service_fee || 0);
    const save = async () => {
        try {
            await api.post(`/admin/visa-products/${schema.visa_product_id}/fees`, { govt_fee: Number(gov), service_fee: Number(srv), currency: "INR" });
            toast.success("New fees active — existing cases unaffected (snapshot rule)");
            reload();
        } catch (e) { toast.error("Failed"); }
    };
    const perPersonTotal = computeLineTotal({
        govtFee: gov,
        serviceFee: srv,
        gstPercent: DEFAULT_GST_PERCENT,
        headcount: 1,
    });
    const serviceGst = Math.round((Number(srv) || 0) * DEFAULT_GST_PERCENT / 100);
    return (
        <div className="bg-surface-card border border-border rounded-sm p-4 mt-3 space-y-3" data-testid="pricing-tab">
            <div className="text-xs text-ink-muted">Changing pricing does NOT affect existing cases — snapshot rule §8.3.</div>
            <div className="grid grid-cols-2 gap-3">
                <F label={FEE_LABELS.govt}><input type="number" className={inp} value={gov} onChange={(e) => setGov(e.target.value)} data-testid="fee-govt" /></F>
                <F label={FEE_LABELS.service}><input type="number" className={inp} value={srv} onChange={(e) => setSrv(e.target.value)} data-testid="fee-service" /></F>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="text-sm text-ink-muted space-y-0.5">
                    <div>Per person: <span className="font-mono">{INR.format(perPersonTotal)}</span></div>
                    <div className="text-[11px]">Includes {INR.format(serviceGst)} GST on service fee ({DEFAULT_GST_PERCENT}%)</div>
                </div>
                <button onClick={save} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="fee-save">Save new pricing</button>
            </div>
        </div>
    );
}

function CustomerPreviewCard({ schema }) {
    const total = computeLineTotal({
        govtFee: schema.fees?.govt_fee || 0,
        serviceFee: schema.fees?.service_fee || 0,
        gstPercent: DEFAULT_GST_PERCENT,
        headcount: 1,
    });
    return (
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
            {schema.banner_image_url && <img src={resolveFileUrl(schema.banner_image_url)} alt="" className="w-full h-32 object-cover" />}
            <div className="p-3">
                <div className="text-xs text-ink-muted">{schema.country_flag} {schema.country_name}</div>
                <div className="font-display text-lg text-navy leading-tight mt-1">{schema.title}</div>
                <div className="text-[10px] font-mono uppercase text-ink-muted mt-2">{schema.processing_time_days}d process · {schema.validity_days}d valid</div>
                <div className="pt-3 mt-3 border-t border-border flex items-end justify-between">
                    <div>
                        <div className="text-[9px] uppercase font-mono text-ink-muted">From</div>
                        <div className="font-display text-lg text-ink">{INR.format(total)}</div>
                    </div>
                    <Stamp tone="gold" size="sm">Guaranteed</Stamp>
                </div>
                <div className="mt-3 text-xs text-ink-muted">{schema.documents.length} docs · {schema.fields.length} extra questions</div>
            </div>
        </div>
    );
}

const inp = "w-full h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
function F({ label, children }) {
    return (
        <label className="block text-sm">
            <span className="text-xs text-ink-muted block mb-1">{label}</span>
            {children}
        </label>
    );
}
