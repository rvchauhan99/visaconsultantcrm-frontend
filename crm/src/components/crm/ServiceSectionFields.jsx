import React from "react";
import { CrmField, CrmInput, CrmTextarea } from "@/components/ui/crm-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { CountrySelect, ProductSelect, PassportProductSelect } from "@/components/forms/selects";
import { DatePicker } from "@/components/ui/date-picker";
import {
  SERVICE_FIELD_SCHEMAS,
  SERVICE_TYPE_LABELS,
  VISA_TYPE_OPTIONS,
  PASSPORT_SERVICE_OPTIONS,
} from "@/lib/leadServiceSchemas";
import {
  DEFAULT_GST_PERCENT,
  INR,
  snapshotFeesFromProduct,
  computeVisaTotal,
  computePassportTotal,
} from "@/lib/productPricing";

function formatReadonlyValue(field, details) {
  const raw = details[field.key];
  if (raw == null || raw === "") return "—";
  if (field.format === "visa_type") {
    return VISA_TYPE_OPTIONS.find((o) => o.value === raw)?.label || raw;
  }
  if (field.format === "passport_service") {
    return PASSPORT_SERVICE_OPTIONS.find((o) => o.value === raw)?.label || raw;
  }
  return String(raw);
}

function applyVisaProduct(details, product) {
  if (!product) {
    return {
      ...details,
      visa_product_id: "",
      country_code: "",
      visa_type: "",
      govt_fee_per_person: "",
      service_fee_per_person: "",
      total_amount: 0,
    };
  }
  const fees = snapshotFeesFromProduct(product);
  const next = {
    ...details,
    visa_product_id: product.id,
    country_code: product.country_code || "",
    visa_type: product.visa_type || "",
    govt_fee_per_person: fees.govt_fee_per_person,
    service_fee_per_person: fees.service_fee_per_person,
    gst_percent: details.gst_percent ?? DEFAULT_GST_PERCENT,
  };
  next.total_amount = computeVisaTotal(next);
  return next;
}

function applyPassportProduct(details, product) {
  if (!product) {
    return {
      ...details,
      passport_product_id: "",
      passport_service_type: "",
      govt_fee_per_person: "",
      service_fee_per_person: "",
      total_amount: 0,
    };
  }
  const fees = snapshotFeesFromProduct(product);
  const next = {
    ...details,
    passport_product_id: product.id,
    passport_service_type: product.passport_service_type || "",
    govt_fee_per_person: fees.govt_fee_per_person,
    service_fee_per_person: fees.service_fee_per_person,
    gst_percent: details.gst_percent ?? DEFAULT_GST_PERCENT,
  };
  next.total_amount = computePassportTotal(next);
  return next;
}

export default function ServiceSectionFields({ serviceType, details, onChange }) {
  const schema = SERVICE_FIELD_SCHEMAS[serviceType] || [];

  const setKey = (key, value) => {
    const next = { ...details, [key]: value };
    if (serviceType === "visa") next.total_amount = computeVisaTotal(next);
    if (serviceType === "passport") next.total_amount = computePassportTotal(next);
    onChange(next);
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-surface-card/50">
      <div className="text-[10px] uppercase tracking-widest font-mono text-ink-muted border-b border-border pb-2">
        {SERVICE_TYPE_LABELS[serviceType] || serviceType}
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {schema.map((field) => {
          if (field.showIf && !field.showIf(details)) return null;

          if (field.type === "product_visa") {
            return (
              <CrmField key={field.key} label={field.label} required={field.required} className="md:col-span-3">
                <ProductSelect
                  value={details[field.key] || null}
                  onChange={(v) => {
                    if (!v) onChange(applyVisaProduct(details, null));
                  }}
                  onProductChange={(product) => onChange(applyVisaProduct(details, product))}
                  placeholder="Select visa product…"
                  testId="lead-visa-product"
                />
              </CrmField>
            );
          }

          if (field.type === "product_passport") {
            return (
              <CrmField key={field.key} label={field.label} required={field.required} className="md:col-span-3">
                <PassportProductSelect
                  value={details[field.key] || null}
                  onChange={(v) => {
                    if (!v) onChange(applyPassportProduct(details, null));
                  }}
                  onProductChange={(product) => onChange(applyPassportProduct(details, product))}
                  placeholder="Select passport product…"
                  testId="lead-passport-product"
                />
              </CrmField>
            );
          }

          if (field.type === "readonly") {
            return (
              <CrmField key={field.key} label={field.label}>
                <CrmInput
                  readOnly
                  value={formatReadonlyValue(field, details)}
                  className="bg-surface-muted/50"
                />
              </CrmField>
            );
          }

          if (field.type === "money_readonly") {
            const val = details[field.key];
            const display = field.key === "gst_percent"
              ? (val != null && val !== "" ? `${val}%` : `${DEFAULT_GST_PERCENT}%`)
              : (val != null && val !== "" ? INR.format(Number(val)) : "—");
            return (
              <CrmField key={field.key} label={field.label}>
                <CrmInput readOnly value={display} className="bg-surface-muted/50 font-mono" />
              </CrmField>
            );
          }

          if (field.type === "country") {
            return (
              <CrmField key={field.key} label={field.label}>
                <CountrySelect
                  value={details[field.key] || null}
                  onChange={(v) => setKey(field.key, v || "")}
                  placeholder="Select country…"
                />
              </CrmField>
            );
          }

          if (field.type === "select") {
            return (
              <CrmField key={field.key} label={field.label}>
                <SearchableSelect
                  clearable
                  value={details[field.key] || null}
                  onChange={(v) => setKey(field.key, v || "")}
                  options={field.options || []}
                  placeholder="Select…"
                />
              </CrmField>
            );
          }

          if (field.type === "textarea") {
            return (
              <CrmField key={field.key} label={field.label} className="md:col-span-3">
                <CrmTextarea
                  rows={2}
                  value={details[field.key] || ""}
                  onChange={(e) => setKey(field.key, e.target.value)}
                />
              </CrmField>
            );
          }

          if (field.type === "checkbox") {
            return (
              <CrmField key={field.key} label={field.label} className="flex items-end">
                <label className="flex items-center gap-2 text-xs cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={!!details[field.key]}
                    onChange={(e) => setKey(field.key, e.target.checked)}
                    className="rounded border-border"
                  />
                  Yes
                </label>
              </CrmField>
            );
          }

          if (field.type === "date") {
            return (
              <CrmField key={field.key} label={field.label}>
                <DatePicker
                  value={details[field.key] || ""}
                  onChange={(v) => setKey(field.key, v || "")}
                />
              </CrmField>
            );
          }

          return (
            <CrmField key={field.key} label={field.label}>
              <CrmInput
                type={field.type === "number" ? "number" : "text"}
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
                value={details[field.key] ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  setKey(
                    field.key,
                    field.type === "number" ? (raw === "" ? "" : Number(raw)) : raw,
                  );
                }}
              />
            </CrmField>
          );
        })}
      </div>
    </div>
  );
}
