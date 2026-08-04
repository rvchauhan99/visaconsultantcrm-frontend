import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmCard } from "@/components/ui/crm-card";
import { CrmField, CrmInput, CrmTextarea } from "@/components/ui/crm-field";
import { CrmPhoneField } from "@/components/ui/crm-phone-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { ConsultantSelect } from "@/components/forms/selects";
import { isValidPhoneOptional } from "@/lib/phone";
import ServiceSectionFields from "@/components/crm/ServiceSectionFields";
import {
  SERVICE_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  emptyServiceDetails,
  sumServiceTotals,
  validateProductServiceDetails,
} from "@/lib/leadServiceSchemas";
import { INR } from "@/lib/productPricing";

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

const initialClient = {
  full_name: "",
  email: "",
  phone: "",
  alternative_phone: "",
  city: "",
  assigned_to: null,
  source: "website",
};

const initialLeadInfo = {
  lead_value: 0,
  status: "new",
  language_preference: "",
  notes: "",
};

export default function LeadCreate() {
  const nav = useNavigate();
  const [selectedServices, setSelectedServices] = useState(["visa"]);
  const [client, setClient] = useState(initialClient);
  const [leadInfo, setLeadInfo] = useState(initialLeadInfo);
  const [serviceDetailsMap, setServiceDetailsMap] = useState({ visa: emptyServiceDetails("visa") });
  const [saving, setSaving] = useState(false);

  const onServicesChange = (vals) => {
    const next = vals?.length ? vals : [];
    setSelectedServices(next);
    setServiceDetailsMap((prev) => {
      const updated = { ...prev };
      next.forEach((st) => {
        if (!updated[st]) updated[st] = emptyServiceDetails(st);
      });
      return updated;
    });
  };

  const resetForm = () => {
    setSelectedServices(["visa"]);
    setClient(initialClient);
    setLeadInfo(initialLeadInfo);
    setServiceDetailsMap({ visa: emptyServiceDetails("visa") });
  };

  const totalDealValue = useMemo(
    () => sumServiceTotals(selectedServices, serviceDetailsMap),
    [selectedServices, serviceDetailsMap],
  );

  useEffect(() => {
    setLeadInfo((prev) => (
      prev.lead_value === totalDealValue ? prev : { ...prev, lead_value: totalDealValue }
    ));
  }, [totalDealValue]);

  const payload = useMemo(() => ({
    full_name: client.full_name.trim(),
    email: client.email.trim() || null,
    phone: client.phone.trim() || null,
    alternative_phone: client.alternative_phone.trim() || null,
    city: client.city.trim() || null,
    source: client.source || null,
    assigned_to: client.assigned_to || null,
    notes: leadInfo.notes.trim() || null,
    status: leadInfo.status,
    language_preference: leadInfo.language_preference || null,
    lead_value: Number(leadInfo.lead_value) || 0,
    services: selectedServices.map((service_type) => ({
      service_type,
      service_details: serviceDetailsMap[service_type] || {},
    })),
  }), [client, leadInfo, selectedServices, serviceDetailsMap]);

  const submit = async (e) => {
    e.preventDefault();
    if (!client.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!selectedServices.length) {
      toast.error("Select at least one service type");
      return;
    }
    for (const st of selectedServices) {
      const err = validateProductServiceDetails(st, serviceDetailsMap[st]);
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (!isValidPhoneOptional(client.phone)) {
      toast.error("Enter a valid phone number");
      return;
    }
    setSaving(true);
    try {
      const r = await api.post("/crm/leads/batch", payload);
      const count = r.data?.leads?.length || selectedServices.length;
      toast.success(`${count} lead(s) created`);
      nav("/leads");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create leads");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto pb-16">
      <PageHeader
        label="Lead"
        title="Add Lead"
        subtitle="One form — individual leads per selected service"
        actions={
          <Link to="/leads">
            <CrmButton variant="solid" size="sm" data-testid="lead-list-btn">
              Lead List
            </CrmButton>
          </Link>
        }
      />

      <form onSubmit={submit} className="space-y-4" data-testid="lead-create-form">
        <CrmCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-border pb-2">
            Service Category
          </h3>
          <CrmField label="Service type" required>
            <SearchableSelect
              multiple
              showChipsInline
              value={selectedServices}
              onChange={onServicesChange}
              options={SERVICE_TYPE_OPTIONS}
              placeholder="Select services…"
              data-testid="lead-service-types"
            />
          </CrmField>
        </CrmCard>

        <CrmCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-border pb-2">
            Client Information
          </h3>
          <div className="grid md:grid-cols-3 gap-3">
            <CrmField label="Name" required>
              <CrmInput
                required
                value={client.full_name}
                onChange={(e) => setClient({ ...client, full_name: e.target.value })}
                placeholder="Enter name"
                data-testid="lead-name"
              />
            </CrmField>
            <CrmField label="Email">
              <CrmInput
                type="email"
                value={client.email}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                placeholder="example@email.com"
                data-testid="lead-email"
              />
            </CrmField>
            <CrmField label="Phone">
              <CrmPhoneField
                value={client.phone}
                onChange={(v) => setClient({ ...client, phone: v })}
                data-testid="lead-phone"
              />
            </CrmField>
            <CrmField label="Alternative phone (optional)">
              <CrmPhoneField
                value={client.alternative_phone}
                onChange={(v) => setClient({ ...client, alternative_phone: v })}
              />
            </CrmField>
            <CrmField label="City">
              <CrmInput
                value={client.city}
                onChange={(e) => setClient({ ...client, city: e.target.value })}
                placeholder="Enter city"
              />
            </CrmField>
            <CrmField label="Executive">
              <ConsultantSelect
                value={client.assigned_to}
                onChange={(v) => setClient({ ...client, assigned_to: v })}
                placeholder="Select executive"
              />
            </CrmField>
            <CrmField label="Source">
              <SearchableSelect
                clearable={false}
                value={client.source}
                onChange={(v) => setClient({ ...client, source: v || "website" })}
                options={SOURCE_OPTIONS}
              />
            </CrmField>
          </div>
        </CrmCard>

        {selectedServices.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted px-1">
              Group &amp; Service Details
            </h3>
            {selectedServices.map((st) => (
              <ServiceSectionFields
                key={st}
                serviceType={st}
                details={serviceDetailsMap[st] || {}}
                onChange={(d) => setServiceDetailsMap((prev) => ({ ...prev, [st]: d }))}
              />
            ))}
          </div>
        )}

        <CrmCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-border pb-2">
            Lead Information
          </h3>
          <div className="grid md:grid-cols-3 gap-3">
            <CrmField label="Lead value (auto-calculated)">
              <CrmInput
                readOnly
                value={INR.format(Number(leadInfo.lead_value) || 0)}
                className="bg-surface-muted/50 font-mono"
                data-testid="lead-value"
              />
            </CrmField>
            <CrmField label="Status">
              <SearchableSelect
                clearable={false}
                value={leadInfo.status}
                onChange={(v) => setLeadInfo({ ...leadInfo, status: v || "new" })}
                options={LEAD_STATUS_OPTIONS}
              />
            </CrmField>
            <CrmField label="Language preference">
              <SearchableSelect
                clearable
                value={leadInfo.language_preference || null}
                onChange={(v) => setLeadInfo({ ...leadInfo, language_preference: v || "" })}
                options={LANGUAGE_OPTIONS}
                placeholder="Select language"
              />
            </CrmField>
          </div>
          <CrmField label="Remarks">
            <CrmTextarea
              rows={4}
              value={leadInfo.notes}
              onChange={(e) => setLeadInfo({ ...leadInfo, notes: e.target.value })}
              placeholder="Notes for all leads in this submission…"
            />
          </CrmField>
        </CrmCard>

        <div className="flex flex-wrap gap-3 justify-end pt-2">
          <Link to="/leads">
            <CrmButton type="button" variant="outline" size="md">
              <ArrowLeft className="w-4 h-4" /> Back
            </CrmButton>
          </Link>
          <CrmButton type="button" variant="outline" size="md" onClick={resetForm}>
            <RotateCcw className="w-4 h-4" /> Clear
          </CrmButton>
          <CrmButton type="submit" variant="solid" size="md" loading={saving} data-testid="lead-generate-btn">
            Generate Lead{selectedServices.length > 1 ? "s" : ""}
          </CrmButton>
        </div>
      </form>
    </div>
  );
}
