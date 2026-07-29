import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { getUser } from "@/lib/api";
import DocumentActions from "@/components/DocumentActions";
import Stamp from "@/components/Stamp";
import { Upload, FileText, Check, Loader2, User, Save, ScanLine, Archive, ExternalLink, ChevronUp } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STEPS = ["Traveler", "Details", "Documents", "Review", "Payment"];
const STEP_KEYS = ["traveler", "details", "documents", "review", "payment"];

export default function Apply() {
    const { productId } = useParams();
    const [searchParams] = useSearchParams();
    const draftParam = searchParams.get("draft");
    const nav = useNavigate();
    const [schema, setSchema] = useState(null);
    const [step, setStep] = useState(0);
    const [traveler, setTraveler] = useState({});
    const [fields, setFields] = useState({});
    const [uploads, setUploads] = useState({}); // {doc_key: {file_url, filename, size_mb}}
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [profiles, setProfiles] = useState([]);
    const [saveAsProfile, setSaveAsProfile] = useState(false);
    const [draftId, setDraftId] = useState(draftParam || null);
    const [draftLoaded, setDraftLoaded] = useState(!draftParam);

    useEffect(() => {
        api.get(`/visa-products/${productId}`).then((r) => {
            setSchema(r.data);
            if (!draftParam) {
                const u = getUser();
                if (u) setTraveler((p) => ({ ...p, full_name: u.full_name || "", email: u.email || "" }));
            }
        }).catch(() => {
            toast.error("This visa is no longer available.");
            nav("/");
        });
        api.get("/customers/me/traveler-profiles").then((r) => setProfiles(r.data)).catch(() => {});
    }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Resume a saved draft when ?draft= is present.
    useEffect(() => {
        if (!draftParam) return;
        api.get(`/cases/drafts/${draftParam}`).then((r) => {
            const d = r.data;
            setTraveler(d.traveler || {});
            setFields(d.field_values || {});
            const um = {};
            (d.document_uploads || []).forEach((u) => {
                um[u.doc_key] = {
                    file_url: u.file_url,
                    filename: u.filename,
                    storage_key: u.storage_key || u.key || null,
                    size_mb: 0,
                };
            });
            setUploads(um);
            setDraftId(d.id);
            const idx = STEP_KEYS.indexOf(d.step);
            setStep(idx >= 0 ? idx : 0);
        }).catch(() => {
            toast.error("Couldn't load your saved application — starting fresh.");
        }).finally(() => setDraftLoaded(true));
    }, [draftParam]);

    useEffect(() => {
        if (draftId) sessionStorage.setItem(`vc_draft_${productId}`, draftId);
    }, [draftId, productId]);

    const uploadsArray = () => Object.entries(uploads).map(([doc_key, u]) => ({
        doc_key,
        file_url: u.file_url,
        filename: u.filename,
        storage_key: u.storage_key || u.key || null,
    }));

    /** Create the draft on first save, then keep it in sync with a PATCH on every step change. */
    const persistDraft = async (stepKey) => {
        let id = draftId;
        if (!id) {
            const res = await api.post("/cases", {
                visa_product_id: productId,
                traveler,
                field_values: fields,
                document_uploads: uploadsArray(),
            });
            id = res.data.draft_id;
            setDraftId(id);
        }
        await api.patch(`/cases/drafts/${id}`, {
            traveler,
            field_values: fields,
            document_uploads: uploadsArray(),
            step: stepKey,
        });
        return id;
    };

    const goNext = async () => {
        const next = Math.min(STEPS.length - 1, step + 1);
        setSavingDraft(true);
        try {
            await persistDraft(STEP_KEYS[next]);
            setStep(next);
        } catch (e) {
            if (e.response?.status === 410) {
                toast.error("This visa product is no longer available. Please choose another visa.");
                nav("/");
            } else {
                toast.error("Couldn't save your progress, but you can continue.");
                setStep(next);
            }
        } finally {
            setSavingDraft(false);
        }
    };

    const prefillFromProfile = async (id) => {
        if (!id) return;
        const r = await api.get(`/customers/me/traveler-profiles/${id}`);
        const p = r.data;
        setTraveler({
            full_name: p.full_name || "",
            dob: p.dob || "",
            passport_number: p.passport_number || "",
            passport_issue_date: p.passport_issue_date || "",
            passport_expiry_date: p.passport_expiry_date || "",
            gender: p.gender || "",
            phone: p.phone || "",
            email: p.email || "",
        });
        toast.success(`Prefilled from ${p.full_name}`);
    };

    if (!schema || !draftLoaded) return <div className="p-10 text-ink-muted">Loading…</div>;

    const total = (schema.fees?.govt_fee || 0) + (schema.fees?.service_fee || 0);
    const requiredDocs = schema.documents.filter((d) => d.required);
    const allRequiredUploaded = requiredDocs.every((d) => uploads[d.doc_key]);
    const requiredFields = schema.fields.filter((f) => f.required);
    const allFieldsFilled = requiredFields.every((f) => (fields[f.field_key] || "").trim() !== "");

    // Traveler fixed fields validation
    const requiredTravelerFields = ["full_name", "dob", "passport_number", "passport_expiry_date", "phone", "email"];
    const passportMinMonths = schema.passport_min_validity_months || 6;
    const passportMinDate = new Date();
    passportMinDate.setMonth(passportMinDate.getMonth() + passportMinMonths);
    const passportValid = traveler.passport_expiry_date ? new Date(traveler.passport_expiry_date) >= passportMinDate : false;
    const travelerReady = requiredTravelerFields.every((k) => (traveler[k] || "").trim() !== "") && passportValid;

    const submit = async (outcome = "success") => {
        setSubmitting(true);
        try {
            const did = await persistDraft("payment");
            const payload = { draft_id: did, outcome };
            if (outcome === "success") {
                const order = await api.post("/cases/checkout/create-order", { draft_id: did });
                payload.order_id = order.data.order_id;
            }
            const checkout = await api.post("/cases/checkout", payload);
            if (checkout.data.status === "success") {
                // If the customer opted in, save this traveler for reuse next time.
                if (saveAsProfile && traveler.passport_number) {
                    try {
                        await api.post("/customers/me/traveler-profiles", {
                            full_name: traveler.full_name,
                            relationship: "self",
                            dob: traveler.dob,
                            passport_number: traveler.passport_number,
                            passport_issue_date: traveler.passport_issue_date,
                            passport_expiry_date: traveler.passport_expiry_date,
                            gender: traveler.gender,
                            phone: traveler.phone,
                            email: traveler.email,
                        });
                    } catch (_) { /* non-blocking */ }
                }
                sessionStorage.removeItem(`vc_draft_${productId}`);
                toast.success("Payment confirmed. Your case has been created.");
                nav(`/status/${checkout.data.case_id}`);
            } else {
                toast.error("Payment failed. You can try again.");
            }
        } catch (e) {
            if (e.response?.status === 410) {
                toast.error("This visa product is no longer available. Please choose another visa.");
            } else {
                toast.error(e.response?.data?.detail || "Something went wrong");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-1 md:py-2 pb-16 md:pb-4">
            {/* Steps indicator */}
            <div className="flex items-center gap-2 md:gap-4 mb-4 overflow-x-auto pb-1" data-testid="apply-steps">
                {STEPS.map((label, i) => (
                    <React.Fragment key={i}>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className={`w-9 h-9 rounded-full border-2 border-double ${i < step ? "border-gold text-gold" : i === step ? "border-navy text-navy" : "border-border text-ink-muted"} flex items-center justify-center text-sm font-mono font-semibold`}>
                                {i < step ? <Check className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`text-xs uppercase font-mono tracking-wider ${i === step ? "text-navy font-medium" : "text-ink-muted"}`}>{label}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={`flex-1 h-px min-w-[10px] ${i < step ? "bg-gold" : "bg-border"}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl">{schema.country_flag}</span>
                <div>
                    <h1 className="font-display text-2xl text-navy leading-tight">{schema.title}</h1>
                    <div className="text-xs font-mono uppercase tracking-widest text-ink-muted hidden md:block">Processing {schema.processing_time_days} days · {INR.format(total)}</div>
                </div>
            </div>

            <div className="bg-white border border-border rounded-xl p-4 md:p-5">
                {step === 0 && <TravelerStep traveler={traveler} setTraveler={setTraveler} profiles={profiles} onPrefill={prefillFromProfile} saveAsProfile={saveAsProfile} setSaveAsProfile={setSaveAsProfile} passportMinMonths={passportMinMonths} passportValid={passportValid} />}
                {step === 1 && <FieldsStep schema={schema} fields={fields} setFields={setFields} />}
                {step === 2 && <DocsStep schema={schema} uploads={uploads} setUploads={setUploads} />}
                {step === 3 && <ReviewStep schema={schema} traveler={traveler} fields={fields} uploads={uploads} />}
                {step === 4 && <PaymentStep schema={schema} total={total} submit={submit} submitting={submitting} />}

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                    <button
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                        data-testid="apply-back"
                        className="text-sm px-5 py-2.5 rounded-full border border-border text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        ← Back
                    </button>
                    {step < 4 && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={saveAndExit}
                                disabled={savingDraft || submitting}
                                data-testid="apply-save-exit"
                                className="text-sm px-4 py-2.5 rounded-full border border-border text-ink hover:bg-surface-card"
                            >
                                <span className="hidden sm:inline">Save &amp; exit</span>
                                <span className="sm:hidden">Save</span>
                            </button>
                            <button
                                onClick={goNext}
                                data-testid="apply-continue"
                                disabled={savingDraft || (step === 0 && !travelerReady) || (step === 1 && !allFieldsFilled) || (step === 2 && !allRequiredUploaded)}
                                className="text-sm px-6 py-2.5 rounded-full bg-navy text-white hover:bg-navy-hover disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                            >
                                {savingDraft && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Continue →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ApplyFeeSheet schema={schema} total={total} processingDays={schema.processing_time_days} />
        </div>
    );
}

function ApplyFeeSheet({ schema, total, processingDays }) {
    return (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur safe-area-pb" data-testid="apply-fee-sheet">
            <Drawer>
                <DrawerTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-5 py-3 text-left">
                        <div>
                            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Fee summary</div>
                            <div className="font-display text-lg text-navy">{INR.format(total)}</div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-teal">
                            Details <ChevronUp className="w-4 h-4" />
                        </span>
                    </button>
                </DrawerTrigger>
                <DrawerContent className="px-5 pb-8">
                    <DrawerHeader>
                        <DrawerTitle className="font-display text-navy">Fee breakdown</DrawerTitle>
                    </DrawerHeader>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-ink-muted">Government fee</span><span className="font-mono">{INR.format(schema.fees?.govt_fee || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-ink-muted">Service fee</span><span className="font-mono">{INR.format(schema.fees?.service_fee || 0)}</span></div>
                        <div className="flex justify-between pt-2 border-t border-border font-medium"><span>Total</span><span className="font-display text-xl text-navy">{INR.format(total)}</span></div>
                        <p className="text-xs text-ink-muted pt-2">Processing about {processingDays} days · no hidden charges</p>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}

function TravelerStep({ traveler, setTraveler, profiles, onPrefill, saveAsProfile, setSaveAsProfile, passportMinMonths, passportValid }) {
    const upd = (k, v) => setTraveler((p) => ({ ...p, [k]: v }));
    const [scanning, setScanning] = useState(false);

    const handleScan = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setScanning(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const r = await api.post("/documents/scan-passport", form, { headers: { "Content-Type": "multipart/form-data" } });
            const d = r.data;
            const merged = {
                ...traveler,
                full_name: d.full_name || traveler.full_name || "",
                passport_number: d.passport_number || traveler.passport_number || "",
                dob: d.date_of_birth || traveler.dob || "",
                passport_issue_date: d.passport_issue_date || traveler.passport_issue_date || "",
                passport_expiry_date: d.passport_expiry_date || traveler.passport_expiry_date || "",
                gender: d.gender || traveler.gender || "",
            };
            setTraveler(merged);
            const filled = ["full_name", "passport_number", "date_of_birth", "passport_expiry_date"].filter((k) => d[k]).length;
            toast.success(`Scanned ${filled} field(s) — please verify accuracy.`);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Couldn't read this passport. Please fill fields manually.");
        } finally {
            setScanning(false);
            e.target.value = "";
        }
    };

    return (
        <div>
            <h2 className="font-display text-xl text-navy mb-0.5">Traveler details</h2>
            <p className="text-sm text-ink-muted mb-2">As per your passport. We only accept Indian passports.</p>

            <div className="flex flex-wrap gap-3 mb-3">
                <label className="inline-flex items-center gap-2 text-sm bg-navy text-white rounded-full px-4 py-2 cursor-pointer hover:bg-navy-hover" data-testid="scan-passport-btn">
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                    {scanning ? "Reading passport…" : "Scan passport to autofill"}
                    <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleScan} disabled={scanning} data-testid="scan-passport-input" />
                </label>
                <span className="text-xs text-ink-muted self-center">Optional — you can also fill fields manually.</span>
            </div>

            {profiles && profiles.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-3 mb-6 flex flex-wrap items-center gap-3" data-testid="prefill-panel">
                    <User className="w-4 h-4 text-navy" />
                    <span className="text-sm text-ink-muted">Prefill from a saved traveler:</span>
                    <select
                        onChange={(e) => onPrefill(e.target.value)}
                        defaultValue=""
                        className="text-sm bg-white border border-border rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-navy"
                        data-testid="prefill-select"
                    >
                        <option value="">— Choose someone —</option>
                        {profiles.map((p) => (
                            <option key={p.id} value={p.id}>{p.full_name} ({p.relationship}) · {p.passport_number_masked || "no passport"}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Full name (as on passport)" required><input data-testid="traveler-name" className={inp} value={traveler.full_name || ""} onChange={(e) => upd("full_name", e.target.value)} /></Field>
                <Field label="Date of birth" required><input type="date" data-testid="traveler-dob" className={inp} value={traveler.dob || ""} onChange={(e) => upd("dob", e.target.value)} /></Field>
                <Field label="Passport number" required><input data-testid="traveler-passport" className={inp} value={traveler.passport_number || ""} onChange={(e) => upd("passport_number", e.target.value.toUpperCase())} /></Field>
                <Field label="Passport expiry" required>
                    <input type="date" data-testid="traveler-passport-expiry" className={inp} value={traveler.passport_expiry_date || ""} onChange={(e) => upd("passport_expiry_date", e.target.value)} />
                    {traveler.passport_expiry_date && !passportValid ? (
                        <p className="text-xs text-danger mt-1" data-testid="passport-validity-error">Must be valid at least {passportMinMonths} more month{passportMinMonths === 1 ? "" : "s"} — please renew before applying.</p>
                    ) : (
                        <p className="text-xs text-ink-muted mt-1">Must be valid at least {passportMinMonths} month{passportMinMonths === 1 ? "" : "s"} from today.</p>
                    )}
                </Field>
                <Field label="Passport issue date"><input type="date" data-testid="traveler-issue" className={inp} value={traveler.passport_issue_date || ""} onChange={(e) => upd("passport_issue_date", e.target.value)} /></Field>
                <Field label="Gender"><select data-testid="traveler-gender" className={inp} value={traveler.gender || ""} onChange={(e) => upd("gender", e.target.value)}><option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
                <Field label="Phone" required><input type="tel" data-testid="traveler-phone" className={inp} value={traveler.phone || ""} onChange={(e) => upd("phone", e.target.value)} /></Field>
                <Field label="Email" required><input type="email" data-testid="traveler-email" className={inp} value={traveler.email || ""} onChange={(e) => upd("email", e.target.value)} /></Field>
            </div>

            <label className="flex items-center gap-2 mt-6 text-sm text-ink-muted cursor-pointer" data-testid="save-as-profile-wrap">
                <input type="checkbox" checked={saveAsProfile} onChange={(e) => setSaveAsProfile(e.target.checked)} data-testid="save-as-profile" />
                <Save className="w-4 h-4" />
                Save this traveler to my account for next time
            </label>
        </div>
    );
}

function FieldsStep({ schema, fields, setFields }) {
    if (schema.fields.length === 0) {
        return <div className="text-center py-8 text-ink-muted">No extra questions for this visa. You can continue.</div>;
    }
    const upd = (k, v) => setFields((p) => ({ ...p, [k]: v }));
    return (
        <div>
            <h2 className="font-display text-xl text-navy mb-1">A few more details</h2>
            <p className="text-sm text-ink-muted mb-4">Specific to {schema.country_name}.</p>
            <div className="grid md:grid-cols-2 gap-x-4 gap-y-3">
                {schema.fields.map((f) => (
                    <Field key={f.field_key} label={f.label} required={f.required}>
                        {f.type === "dropdown" ? (
                            <select data-testid={`field-${f.field_key}`} className={inp} value={fields[f.field_key] || ""} onChange={(e) => upd(f.field_key, e.target.value)}>
                                <option value="">Select…</option>
                                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ) : f.type === "date" ? (
                            <input type="date" data-testid={`field-${f.field_key}`} className={inp} value={fields[f.field_key] || ""} onChange={(e) => upd(f.field_key, e.target.value)} />
                        ) : f.type === "number" ? (
                            <input type="number" data-testid={`field-${f.field_key}`} className={inp} value={fields[f.field_key] || ""} onChange={(e) => upd(f.field_key, e.target.value)} />
                        ) : (
                            <input data-testid={`field-${f.field_key}`} className={inp} value={fields[f.field_key] || ""} onChange={(e) => upd(f.field_key, e.target.value)} />
                        )}
                    </Field>
                ))}
            </div>
        </div>
    );
}

function DocsStep({ schema, uploads, setUploads }) {
    return (
        <div>
            <h2 className="font-display text-xl text-navy mb-1">Upload your documents</h2>
            <p className="text-sm text-ink-muted mb-4">Files are private and encrypted. Only your consultant sees them.</p>
            <div className="space-y-4">
                {schema.documents.map((d) => (
                    <DocUploader key={d.doc_key} doc={d} value={uploads[d.doc_key]} onUpload={(u) => setUploads((prev) => ({ ...prev, [d.doc_key]: u }))} />
                ))}
            </div>
        </div>
    );
}

function DocUploader({ doc, value, onUpload }) {
    const [busy, setBusy] = useState(false);
    const [vaultOptions, setVaultOptions] = useState([]);
    const [showVault, setShowVault] = useState(false);

    useEffect(() => {
        // Only fetch vault for vault-eligible doc keys (from document master via schema)
        if (doc.vault_eligible) {
            api.get(`/customers/me/document-vault/by-key/${doc.doc_key}`)
                .then((r) => setVaultOptions(r.data))
                .catch(() => {});
        }
    }, [doc.doc_key]);

    const reuseFromVault = (v) => {
        onUpload({
            file_url: v.file_url,
            filename: v.filename,
            storage_key: v.storage_key || null,
            size_mb: 0,
            from_vault: true,
        });
        setShowVault(false);
        toast.success(`Reused ${v.filename} from your vault`);
    };

    const handle = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxBytes = doc.max_size_mb * 1024 * 1024;
        if (file.size > maxBytes) {
            toast.error(`This file is too large — max ${doc.max_size_mb}MB`);
            return;
        }
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!doc.formats.includes(ext)) {
            toast.error(`Format not allowed — use ${doc.formats.join(", ").toUpperCase()}`);
            return;
        }
        setBusy(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await api.post(`/documents/upload?doc_key=${encodeURIComponent(doc.doc_key)}`, form, { headers: { "Content-Type": "multipart/form-data" } });
            onUpload(res.data);
            toast.success(`${doc.name} uploaded`);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Upload failed");
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="p-4 bg-surface border border-border rounded-xl" data-testid={`upload-${doc.doc_key}`}>
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-ink-muted" />
                        <span className="font-medium text-sm">{doc.name}</span>
                        {!doc.required && <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Optional</span>}
                        {value && <Stamp tone="success" size="sm">Uploaded</Stamp>}
                    </div>
                    {doc.description && <p className="text-xs text-ink-muted mt-1">{doc.description}</p>}
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-[10px] font-mono uppercase text-ink-muted">{doc.formats.join(", ")} · max {doc.max_size_mb}MB</p>
                        {doc.sample_file_url && (
                            <a href={doc.sample_file_url} target="_blank" rel="noreferrer" data-testid={`sample-${doc.doc_key}`} className="text-[10px] font-mono uppercase text-teal hover:underline inline-flex items-center gap-1">
                                <ExternalLink className="w-2.5 h-2.5" /> View sample
                            </a>
                        )}
                    </div>
                    {value && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-teal truncate">
                                {value.filename}
                                {value.from_vault && <span className="text-ink-muted ml-1">(from vault)</span>}
                            </p>
                            <DocumentActions fileUrl={value.file_url} filename={value.filename} testIdPrefix={`apply-doc-${doc.doc_key}`} />
                        </div>
                    )}
                </div>
                <div className="shrink-0 flex flex-col gap-1.5">
                    {vaultOptions.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowVault(!showVault)}
                            className="text-xs inline-flex items-center gap-1 border border-teal text-teal rounded-full px-3 py-1 hover:bg-teal hover:text-white transition-colors"
                            data-testid={`vault-${doc.doc_key}`}
                        >
                            <Archive className="w-3 h-3" /> Reuse from vault
                        </button>
                    )}
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 text-sm border border-ink rounded-full px-4 py-2 hover:bg-ink hover:text-white transition-colors">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {value ? "Replace" : "Upload"}
                        <input type="file" hidden accept={doc.formats.map((f) => "." + f).join(",")} onChange={handle} data-testid={`upload-input-${doc.doc_key}`} />
                    </label>
                </div>
            </div>
            {showVault && vaultOptions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border" data-testid={`vault-list-${doc.doc_key}`}>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">Your saved {doc.name.toLowerCase()}s</div>
                    <div className="space-y-1.5">
                        {vaultOptions.map((v) => (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => reuseFromVault(v)}
                                className="w-full text-left text-sm bg-white border border-border rounded-md p-2 hover:border-teal flex items-center justify-between"
                                data-testid={`vault-item-${v.id.slice(0, 6)}`}
                            >
                                <span className="truncate">{v.filename}</span>
                                <span className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-mono uppercase text-ink-muted">{new Date(v.created_at).toLocaleDateString("en-IN")}</span>
                                    <DocumentActions fileUrl={v.file_url} filename={v.filename} testIdPrefix={`vault-item-view-${v.id.slice(0, 6)}`} showDownload={false} />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ReviewStep({ schema, traveler, fields, uploads, onSaveExit }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="font-display text-xl text-navy mb-1">Review &amp; confirm</h2>
                    <p className="text-sm text-ink-muted">Please verify all details before payment. Incorrect info leads to rejection.</p>
                </div>
                <button onClick={onSaveExit} className="text-sm text-ink-muted underline hover:text-navy">Save &amp; exit</button>
            </div>
            <div className="space-y-6">
                <ReviewBlock title="Traveler">
                    {Object.entries(traveler).map(([k, v]) => v && <ReviewRow key={k} label={k.replace(/_/g, " ")} value={v} />)}
                </ReviewBlock>
                {schema.fields.length > 0 && (
                    <ReviewBlock title="Details">
                        {schema.fields.map((f) => <ReviewRow key={f.field_key} label={f.label} value={fields[f.field_key] || "—"} />)}
                    </ReviewBlock>
                )}
                <ReviewBlock title="Documents">
                    {schema.documents.map((d) => {
                        const up = uploads[d.doc_key];
                        return (
                            <div key={d.doc_key} className="flex items-center justify-between px-4 py-3 text-sm gap-3 hover:bg-surface-card/50 transition-colors">
                                <span className="text-ink-muted capitalize">{d.name}</span>
                                <span className="flex flex-col items-end gap-1 min-w-0">
                                    <span className="text-ink font-mono truncate max-w-[40ch] text-right font-medium">
                                        {up?.filename || (d.required ? "MISSING" : "not provided")}
                                    </span>
                                    {up?.file_url && (
                                        <DocumentActions fileUrl={up.file_url} filename={up.filename} testIdPrefix={`review-doc-${d.doc_key}`} />
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </ReviewBlock>
            </div>
        </div>
    );
}

function ReviewBlock({ title, children }) {
    return (
        <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">{title}</div>
            <div className="border border-border rounded-xl divide-y divide-border">{children}</div>
        </div>
    );
}
function ReviewRow({ label, value }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-ink-muted capitalize">{label}</span>
            <span className="text-ink font-mono truncate max-w-[60%] text-right">{value}</span>
        </div>
    );
}

function PaymentStep({ schema, total, submit, submitting }) {
    return (
        <div>
            <h2 className="font-display text-xl text-navy mb-1">Payment</h2>
            <p className="text-sm text-ink-muted mb-6">Government fee and service fee shown separately. No hidden charges.</p>
            <div className="bg-surface border border-border rounded-xl p-6 max-w-md mx-auto">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-ink-muted">Government fee</span>
                    <span className="font-mono">{INR.format(schema.fees?.govt_fee || 0)}</span>
                </div>
                <div className="flex justify-between text-sm mb-4 pb-4 border-b border-border">
                    <span className="text-ink-muted">Service fee</span>
                    <span className="font-mono">{INR.format(schema.fees?.service_fee || 0)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-3xl text-navy">{INR.format(total)}</span>
                </div>
            </div>
            <div className="mt-6 max-w-md mx-auto space-y-3">
                <div className="text-center text-xs font-mono uppercase text-ink-muted">Mock payment · replace with real gateway later</div>
                <button
                    onClick={() => submit("success")}
                    disabled={submitting}
                    data-testid="pay-success"
                    className="w-full py-3 rounded-full bg-navy text-white hover:bg-navy-hover disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Pay {INR.format(total)}
                </button>
                <button onClick={() => submit("failure")} disabled={submitting} data-testid="pay-failure" className="w-full py-2 text-sm text-ink-muted underline hover:text-ink">
                    Simulate a failed payment
                </button>
            </div>
        </div>
    );
}

const inp = "w-full h-9 px-3 border border-border rounded-md bg-white text-sm text-ink outline-none focus:ring-2 focus:ring-navy focus:border-navy";
function Field({ label, required, children }) {
    return (
        <label className="block">
            <span className="text-xs text-ink-muted mb-1.5 block">{label}{required && <span className="text-danger ml-0.5">*</span>}</span>
            {children}
        </label>
    );
}
