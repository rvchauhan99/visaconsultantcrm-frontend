import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Upload, PlusSquare } from "lucide-react";
import { ProductSelect } from "@/components/forms/selects";
import { PageHeader, SectionLabel } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmCard } from "@/components/ui/crm-card";
import { CrmField, CrmInput, CrmSelect } from "@/components/ui/crm-field";
import Stamp from "@/components/Stamp";

export default function OfflineCase() {
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
      nav(`/cases/${r.data.case_id}`);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
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
              value={productId}
              onChange={setProductId}
              placeholder="Select a visa product…"
              testId="offline-product"
            />
          </div>
        </CrmField>
      </CrmCard>

      {schema && (
        <form onSubmit={submit} className="space-y-6" data-testid="offline-form">
          {/* Customer */}
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

          {/* Traveler */}
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

          {/* Custom Fields */}
          {schema.fields.length > 0 && (
            <CrmCard className="p-5">
              <SectionLabel>Custom Fields</SectionLabel>
              <div className="grid md:grid-cols-2 gap-4">
                {schema.fields.map((f) => (
                  <CrmField key={f.id} label={f.name} required={f.required} hint={f.description}>
                    <CrmInput
                      required={f.required}
                      value={fields[f.field_key] || ""}
                      onChange={(e) => setFields({ ...fields, [f.field_key]: e.target.value })}
                      data-testid={`oc-field-${f.field_key}`}
                    />
                  </CrmField>
                ))}
              </div>
            </CrmCard>
          )}

          {/* Documents */}
          {schema.documents.length > 0 && (
            <CrmCard className="p-5">
              <SectionLabel>Documents</SectionLabel>
              <div className="space-y-4">
                {schema.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border border-border p-3 rounded-md bg-surface">
                    <div>
                      <div className="text-sm font-medium">{d.name} {d.required && <span className="text-danger">*</span>}</div>
                      <div className="text-xs text-ink-muted">{d.description}</div>
                    </div>
                    {uploads[d.doc_key] ? (
                      <Stamp tone="success" size="sm">uploaded</Stamp>
                    ) : (
                      <label className="text-xs inline-flex items-center gap-1.5 border border-navy text-navy px-3 py-1.5 rounded-md hover:bg-navy-hover hover:text-white cursor-pointer transition-colors shadow-sm">
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
                ))}
              </div>
            </CrmCard>
          )}

          {/* Payment */}
          <CrmCard className="p-5">
            <SectionLabel>Payment (Bypass)</SectionLabel>
            <div className="grid md:grid-cols-3 gap-4">
              <CrmField label="Status">
                <CrmSelect value={payment.status} onChange={(e) => setPayment({ ...payment, status: e.target.value })} data-testid="oc-pay-status">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
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
