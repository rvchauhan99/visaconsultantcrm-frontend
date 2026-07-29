import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Upload, PlusSquare, Check } from "lucide-react";
import { ProductSelect } from "@/components/forms/selects";
import { PageHeader, SectionLabel } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmCard } from "@/components/ui/crm-card";
import { CrmField, CrmInput, CrmSelect, CrmTextarea } from "@/components/ui/crm-field";
import Stamp from "@/components/Stamp";

function sortByOrder(items) {
  return [...(items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function DynamicFieldInput({ field, value, onChange }) {
  const testId = `oc-field-${field.field_key}`;
  const common = {
    required: !!field.required,
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    "data-testid": testId,
  };

  if (field.type === "dropdown" || field.type === "select") {
    return (
      <CrmSelect {...common}>
        <option value="">Select…</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </CrmSelect>
    );
  }
  if (field.type === "date") {
    return <CrmInput type="date" {...common} />;
  }
  if (field.type === "number") {
    return <CrmInput type="number" {...common} />;
  }
  if (field.type === "textarea" || field.type === "long_text") {
    return <CrmTextarea rows={3} {...common} />;
  }
  return <CrmInput type="text" {...common} />;
}

export default function OfflineCase() {
  const [productId, setProductId] = useState("");
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [customer, setCustomer] = useState({ email: "", full_name: "", phone: "" });
  const [traveler, setTraveler] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    passport_number: "",
    passport_expiry_date: "",
    nationality: "Indian",
  });
  const [fields, setFields] = useState({});
  const [uploads, setUploads] = useState({});
  const [payment, setPayment] = useState({ status: "pending", method: "", reference: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const schemaFields = useMemo(() => sortByOrder(schema?.fields), [schema]);
  const schemaDocs = useMemo(() => sortByOrder(schema?.documents), [schema]);

  useEffect(() => {
    if (!productId) {
      setSchema(null);
      return;
    }
    setSchemaLoading(true);
    setFields({});
    setUploads({});
    api.get(`/visa-products/${productId}`)
      .then((r) => setSchema(r.data))
      .catch(() => {
        toast.error("Failed to load visa product schema");
        setSchema(null);
      })
      .finally(() => setSchemaLoading(false));
  }, [productId]);

  const setFieldValue = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const uploadDoc = async (docKey, file) => {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/documents/staff-upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploads((u) => ({ ...u, [docKey]: res.data }));
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    }
  };

  const validate = () => {
    if (!productId || !schema) return "Select a visa product";
    if (!customer.full_name?.trim() || !customer.email?.trim() || !customer.phone?.trim()) {
      return "Customer name, email, and phone are required";
    }
    const requiredTraveler = [
      "first_name", "last_name", "date_of_birth",
      "passport_number", "passport_expiry_date", "nationality",
    ];
    for (const k of requiredTraveler) {
      if (!String(traveler[k] || "").trim()) return "Complete all required traveler fields";
    }
    for (const f of schemaFields) {
      if (f.required && !String(fields[f.field_key] ?? "").trim()) {
        return `Required field: ${f.label || f.field_key}`;
      }
    }
    for (const d of schemaDocs) {
      if (d.required && !uploads[d.doc_key]) {
        return `Required document: ${d.name || d.doc_key}`;
      }
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const payStatus = payment.status === "partial" ? "pending" : payment.status;
      const body = {
        visa_product_id: productId,
        customer_email: customer.email.trim(),
        customer_full_name: customer.full_name.trim(),
        customer_phone: customer.phone.trim(),
        traveler,
        field_values: fields,
        document_uploads: Object.entries(uploads).map(([k, v]) => ({
          doc_key: k,
          file_url: v.file_url,
          filename: v.filename,
          storage_key: v.storage_key || v.key || null,
        })),
        payment_status: payStatus === "paid" ? "paid" : "pending",
        payment_method: payment.method || null,
        payment_reference: payment.reference || null,
      };
      const r = await api.post("/crm/cases", body);
      toast.success("Offline case created");
      nav(`/cases/${r.data.case_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <PageHeader
        label="Cases"
        title="New offline case"
        subtitle="Manually create a case without customer portal checkout"
      />

      <CrmCard className="p-5">
        <CrmField label="Visa Product" required>
          <div className="max-w-sm">
            <ProductSelect
              value={productId || null}
              onChange={(id) => setProductId(id || "")}
              placeholder="Select a visa product…"
              testId="offline-product"
            />
          </div>
        </CrmField>
        {schemaLoading && (
          <div className="text-xs text-ink-muted mt-2 font-mono">Loading product requirements…</div>
        )}
        {schema && (
          <div className="text-xs text-ink-muted mt-2">
            {schema.title || schema.country_name} · {schemaFields.length} fields · {schemaDocs.length} documents
          </div>
        )}
      </CrmCard>

      {schema && !schemaLoading && (
        <form onSubmit={submit} className="space-y-6" data-testid="offline-form">
          <CrmCard className="p-5">
            <SectionLabel>Customer</SectionLabel>
            <div className="grid md:grid-cols-3 gap-4">
              <CrmField label="Full name" required>
                <CrmInput required value={customer.full_name} onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })} data-testid="oc-name" />
              </CrmField>
              <CrmField label="Email" required>
                <CrmInput type="email" required value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} data-testid="oc-email" />
              </CrmField>
              <CrmField label="Phone" required>
                <CrmInput required value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} data-testid="oc-phone" />
              </CrmField>
            </div>
          </CrmCard>

          <CrmCard className="p-5">
            <SectionLabel>Traveler</SectionLabel>
            <div className="grid md:grid-cols-3 gap-4">
              <CrmField label="First name" required>
                <CrmInput required value={traveler.first_name || ""} onChange={(e) => setTraveler({ ...traveler, first_name: e.target.value })} data-testid="oc-t-first" />
              </CrmField>
              <CrmField label="Last name" required>
                <CrmInput required value={traveler.last_name || ""} onChange={(e) => setTraveler({ ...traveler, last_name: e.target.value })} data-testid="oc-t-last" />
              </CrmField>
              <CrmField label="DOB" required>
                <CrmInput type="date" required value={traveler.date_of_birth || ""} onChange={(e) => setTraveler({ ...traveler, date_of_birth: e.target.value })} data-testid="oc-t-dob" />
              </CrmField>
              <CrmField label="Passport Number" required>
                <CrmInput required value={traveler.passport_number || ""} onChange={(e) => setTraveler({ ...traveler, passport_number: e.target.value })} data-testid="oc-t-pass" />
              </CrmField>
              <CrmField label="Passport Expiry" required>
                <CrmInput type="date" required value={traveler.passport_expiry_date || ""} onChange={(e) => setTraveler({ ...traveler, passport_expiry_date: e.target.value })} data-testid="oc-t-exp" />
              </CrmField>
              <CrmField label="Nationality" required>
                <CrmInput required value={traveler.nationality || ""} onChange={(e) => setTraveler({ ...traveler, nationality: e.target.value })} data-testid="oc-t-nat" />
              </CrmField>
            </div>
          </CrmCard>

          <CrmCard className="p-5">
            <SectionLabel>Product fields</SectionLabel>
            {schemaFields.length === 0 ? (
              <div className="text-sm text-ink-muted">No extra fields on this product.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4" data-testid="oc-fields-grid">
                {schemaFields.map((f) => (
                  <CrmField
                    key={f.field_key}
                    label={f.label || f.field_key}
                    required={!!f.required}
                    hint={f.description || undefined}
                  >
                    <DynamicFieldInput
                      field={f}
                      value={fields[f.field_key]}
                      onChange={(v) => setFieldValue(f.field_key, v)}
                    />
                  </CrmField>
                ))}
              </div>
            )}
          </CrmCard>

          <CrmCard className="p-5">
            <SectionLabel>Documents</SectionLabel>
            {schemaDocs.length === 0 ? (
              <div className="text-sm text-ink-muted">No documents required on this product.</div>
            ) : (
              <div className="space-y-3" data-testid="oc-docs-list">
                {schemaDocs.map((d) => {
                  const uploaded = uploads[d.doc_key];
                  const formats = (d.formats || d.formats_allowed || []).join(", ");
                  return (
                    <div
                      key={d.doc_key}
                      className="flex items-center justify-between gap-3 border border-border p-3 rounded-md bg-surface"
                      data-testid={`oc-doc-row-${d.doc_key}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink">
                          {d.name || d.doc_key}
                          {d.required ? <span className="text-danger"> *</span> : null}
                        </div>
                        {d.description ? (
                          <div className="text-xs text-ink-muted mt-0.5">{d.description}</div>
                        ) : null}
                        {formats ? (
                          <div className="text-[10px] font-mono text-ink-muted mt-1 uppercase tracking-wide">
                            {formats}
                            {d.max_size_mb ? ` · max ${d.max_size_mb}MB` : ""}
                          </div>
                        ) : null}
                        {uploaded?.filename ? (
                          <div className="text-[10px] font-mono text-teal mt-1 truncate">{uploaded.filename}</div>
                        ) : null}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {uploaded ? (
                          <>
                            <Stamp tone="success" size="sm">
                              <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> uploaded</span>
                            </Stamp>
                            <label className="text-xs inline-flex items-center gap-1 border border-border text-ink-muted px-2 py-1 rounded-md hover:bg-surface-muted cursor-pointer">
                              Replace
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && uploadDoc(d.doc_key, e.target.files[0])}
                                data-testid={`oc-doc-${d.doc_key}`}
                              />
                            </label>
                          </>
                        ) : (
                          <label className="text-xs inline-flex items-center gap-1.5 border border-navy text-navy px-3 py-1.5 rounded-md hover:bg-navy hover:text-white cursor-pointer transition-colors shadow-sm">
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && uploadDoc(d.doc_key, e.target.files[0])}
                              data-testid={`oc-doc-${d.doc_key}`}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CrmCard>

          <CrmCard className="p-5">
            <SectionLabel>Payment (Bypass)</SectionLabel>
            <div className="grid md:grid-cols-3 gap-4">
              <CrmField label="Status">
                <CrmSelect value={payment.status} onChange={(e) => setPayment({ ...payment, status: e.target.value })} data-testid="oc-pay-status">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </CrmSelect>
              </CrmField>
              <CrmField label="Method">
                <CrmInput value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} placeholder="e.g. Bank transfer" data-testid="oc-pay-method" />
              </CrmField>
              <CrmField label="Reference">
                <CrmInput value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} placeholder="Receipt or Ref #" data-testid="oc-pay-ref" />
              </CrmField>
            </div>
          </CrmCard>

          <div className="flex justify-end pt-2">
            <CrmButton type="submit" variant="solid" size="md" loading={busy} data-testid="oc-submit">
              <PlusSquare className="w-4 h-4" />
              Create offline case
            </CrmButton>
          </div>
        </form>
      )}
    </div>
  );
}
