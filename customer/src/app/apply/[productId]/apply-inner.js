"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Check,
  ChevronUp,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  ScanLine,
  Upload,
  User,
} from "lucide-react";
import api from "@/lib/api";
import DocumentActions from "@/components/ui/document-actions";
import { draftKey, getUser } from "@/lib/session";
import { INR, humanizeKey, cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";
import { useTravelerProfiles, useVaultByKey, useVisaProduct } from "@/hooks/customer-api";
import Stamp from "@/components/ui/stamp";
import { Button } from "@/components/ui/button";
import { Card, ErrorState, Skeleton } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const STEPS = ["Traveler", "Details", "Documents", "Review", "Payment"];
const STEP_KEYS = ["traveler", "details", "documents", "review", "payment"];
const ALLOW_MOCK_PAYMENT = process.env.NEXT_PUBLIC_ALLOW_MOCK_PAYMENT === "true";

export default function ApplyPageInner() {
  const { productId } = useParams();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get("draft");
  const router = useRouter();

  const { data: schema, isLoading: productLoading, isError: productError, error: productErr, refetch } = useVisaProduct(productId);
  const { data: profiles = [] } = useTravelerProfiles(true);

  const [step, setStep] = useState(0);
  const [traveler, setTraveler] = useState({});
  const [fields, setFields] = useState({});
  const [uploads, setUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [draftId, setDraftId] = useState(draftParam || null);
  const [draftLoaded, setDraftLoaded] = useState(!draftParam);
  const [prefilledUser, setPrefilledUser] = useState(false);

  // Prefill contact from session when starting fresh (no draft).
  useEffect(() => {
    if (draftParam || prefilledUser || !schema) return;
    const u = getUser();
    if (u) {
      setTraveler((p) => ({
        ...p,
        full_name: p.full_name || u.full_name || "",
        email: p.email || u.email || "",
      }));
    }
    setPrefilledUser(true);
    track("apply_opened", { product_id: productId });
  }, [schema, draftParam, prefilledUser, productId]);

  // Resume a saved draft when ?draft= is present.
  useEffect(() => {
    if (!draftParam) return;
    let cancelled = false;
    api
      .get(`/cases/drafts/${draftParam}`)
      .then((r) => {
        if (cancelled) return;
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
        track("apply_draft_resumed", { product_id: productId, draft_id: d.id, step: d.step });
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your saved application — starting fresh.");
      })
      .finally(() => {
        if (!cancelled) setDraftLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [draftParam, productId]);

  useEffect(() => {
    if (draftId && productId) sessionStorage.setItem(draftKey(productId), draftId);
  }, [draftId, productId]);

  useEffect(() => {
    if (productErr?.response?.status === 404) {
      toast.error("This visa is no longer available.");
    }
  }, [productErr]);

  const uploadsArray = () =>
    Object.entries(uploads).map(([doc_key, u]) => ({
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

  const handleProductGone = () => {
    toast.error("This visa product is no longer available. Please choose another visa.");
    router.push("/");
  };

  const goNext = async () => {
    const next = Math.min(STEPS.length - 1, step + 1);
    setSavingDraft(true);
    try {
      await persistDraft(STEP_KEYS[next]);
      track("apply_step_continue", { product_id: productId, from: STEP_KEYS[step], to: STEP_KEYS[next] });
      setStep(next);
    } catch (e) {
      if (e.response?.status === 410) {
        handleProductGone();
      } else {
        toast.error("Couldn't save your progress, but you can continue.");
        setStep(next);
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const goBack = async () => {
    if (step === 0) return;
    const prev = Math.max(0, step - 1);
    setSavingDraft(true);
    try {
      await persistDraft(STEP_KEYS[prev]);
      track("apply_step_back", { product_id: productId, from: STEP_KEYS[step], to: STEP_KEYS[prev] });
      setStep(prev);
    } catch (e) {
      if (e.response?.status === 410) {
        handleProductGone();
      } else {
        toast.error("Couldn't save your progress, but you can go back.");
        setStep(prev);
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const saveAndExit = async () => {
    setSavingDraft(true);
    try {
      const id = await persistDraft(STEP_KEYS[step]);
      track("apply_save_exit", { product_id: productId, step: STEP_KEYS[step], draft_id: id });
      toast.success("Progress saved — resume anytime from My account.");
      router.push("/account");
    } catch (e) {
      if (e.response?.status === 410) {
        handleProductGone();
      } else {
        toast.error(e.response?.data?.detail || "Couldn't save your progress");
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const prefillFromProfile = async (id) => {
    if (!id) return;
    try {
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
      track("apply_traveler_prefill", { product_id: productId, profile_id: id });
      toast.success(`Prefilled from ${p.full_name}`);
    } catch {
      toast.error("Couldn't load that traveler profile");
    }
  };

  if (productLoading || !draftLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (productErr?.response?.status === 404) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <Stamp tone="muted" size="lg" className="mx-auto mb-6">
          No longer available
        </Stamp>
        <h1 className="font-display text-3xl text-navy mb-3">This visa is no longer offered</h1>
        <p className="text-ink-muted mb-6">Please choose from our current selection.</p>
        <Button onClick={() => router.push("/")} data-testid="apply-back-catalog">
          Back to catalog
        </Button>
      </div>
    );
  }

  if (productError || !schema) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16">
        <ErrorState title="Couldn't load this visa" onRetry={() => refetch()} />
      </div>
    );
  }

  const total = (schema.fees?.govt_fee || 0) + (schema.fees?.service_fee || 0);
  const requiredDocs = (schema.documents || []).filter((d) => d.required);
  const allRequiredUploaded = requiredDocs.every((d) => uploads[d.doc_key]);
  const requiredFields = (schema.fields || []).filter((f) => f.required);
  const allFieldsFilled = requiredFields.every((f) => (fields[f.field_key] || "").trim() !== "");

  const requiredTravelerFields = ["full_name", "dob", "passport_number", "passport_expiry_date", "phone", "email"];
  const passportMinMonths = schema.passport_min_validity_months || 6;
  const passportMinDate = new Date();
  passportMinDate.setMonth(passportMinDate.getMonth() + passportMinMonths);
  const passportValid = traveler.passport_expiry_date ? new Date(traveler.passport_expiry_date) >= passportMinDate : false;
  const travelerReady = requiredTravelerFields.every((k) => (traveler[k] || "").trim() !== "") && passportValid;

  const continueBlocked =
    (step === 0 && !travelerReady) || (step === 1 && !allFieldsFilled) || (step === 2 && !allRequiredUploaded);

  const blockedHint = (() => {
    if (!continueBlocked) return null;
    if (step === 0) {
      if (traveler.passport_expiry_date && !passportValid) {
        return `Passport must be valid at least ${passportMinMonths} more month${passportMinMonths === 1 ? "" : "s"}`;
      }
      return "Fill all required traveler fields to continue";
    }
    if (step === 1) return "Answer all required questions to continue";
    if (step === 2) return "Upload all required documents to continue";
    return null;
  })();

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
          } catch {
            /* non-blocking */
          }
        }
        sessionStorage.removeItem(draftKey(productId));
        track("apply_payment_success", { product_id: productId, case_id: checkout.data.case_id });
        toast.success("Payment confirmed. Your case has been created.");
        router.push(`/status/${checkout.data.case_id}`);
      } else {
        track("apply_payment_failure", { product_id: productId, draft_id: did });
        toast.error("Payment failed. You can try again.");
      }
    } catch (e) {
      if (e.response?.status === 410) {
        handleProductGone();
      } else {
        toast.error(e.response?.data?.detail || "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-2 md:py-3 pb-20 md:pb-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-4xl md:text-5xl shrink-0 drop-shadow-sm">{schema.country_flag}</span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-4xl text-navy leading-tight truncate">{schema.title}</h1>
            <div className="text-xs font-mono uppercase tracking-widest text-ink-muted mt-1.5 hidden md:block">
              Processing {schema.processing_time_days} days · {INR.format(total)}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={saveAndExit}
          disabled={savingDraft || submitting}
          data-testid="apply-save-exit"
          className="shrink-0 rounded-full border-border/60 hover:bg-surface-card"
        >
          {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Save &amp; exit</span>
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-[24px] bg-[var(--glass)] backdrop-blur-xl border border-[var(--border-glass)] shadow-[var(--shadow-premium)]">
        {/* Step Indicator inside the card */}
        <div className="px-5 md:px-8 py-3 md:py-4 border-b border-[var(--border-glass)] bg-white/40">
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto" data-testid="apply-steps">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-colors duration-300",
                      i < step ? "bg-navy text-white" : i === step ? "border-2 border-navy text-navy bg-white" : "border-2 border-border text-ink-muted bg-white/50"
                    )}
                  >
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={cn(
                    "text-[11px] md:text-xs uppercase font-mono tracking-wider transition-colors duration-300",
                    i === step ? "text-navy font-bold" : "text-ink-muted"
                  )}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px min-w-[20px] bg-border/60 overflow-hidden rounded-full">
                    <motion.div
                      className="h-full bg-navy"
                      initial={{ width: "0%" }}
                      animate={{ width: i < step ? "100%" : "0%" }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Body with Animation */}
        <div className="p-5 md:p-8 pt-6">
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {step === 0 && (
                  <TravelerStep
                    traveler={traveler}
                    setTraveler={setTraveler}
                    profiles={profiles}
                    onPrefill={prefillFromProfile}
                    saveAsProfile={saveAsProfile}
                    setSaveAsProfile={setSaveAsProfile}
                    passportMinMonths={passportMinMonths}
                    passportValid={passportValid}
                  />
                )}
                {step === 1 && <FieldsStep schema={schema} fields={fields} setFields={setFields} />}
                {step === 2 && <DocsStep schema={schema} uploads={uploads} setUploads={setUploads} />}
                {step === 3 && <ReviewStep schema={schema} traveler={traveler} fields={fields} uploads={uploads} />}
                {step === 4 && <PaymentStep schema={schema} total={total} submit={submit} submitting={submitting} />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border-glass)]">
            <div className="flex items-center justify-between">
              <Button type="button" variant="secondary" onClick={goBack} disabled={step === 0 || savingDraft} data-testid="apply-back" className="rounded-full px-6 bg-white/50 hover:bg-white">
                ← Back
              </Button>
              {step < 4 && (
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={saveAndExit} disabled={savingDraft || submitting} data-testid="apply-save-exit-bottom" className="rounded-full px-6 border-border/60 hover:bg-surface-card">
                    <span className="hidden sm:inline">Save &amp; exit</span>
                    <span className="sm:hidden">Save</span>
                  </Button>
                  <Button type="button" onClick={goNext} disabled={savingDraft || continueBlocked} data-testid="apply-continue" className="rounded-full px-8 shadow-sm hover:shadow transition-shadow">
                    {savingDraft && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Continue →
                  </Button>
                </div>
              )}
            </div>
            {blockedHint && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs font-medium text-danger/80 text-right mt-3" data-testid="apply-blocked-hint" role="status"
              >
                {blockedHint}
              </motion.p>
            )}
          </div>
        </div>
      </div>

      <ApplyFeeSheet schema={schema} total={total} processingDays={schema.processing_time_days} />
    </div>
  );
}

function ApplyFeeSheet({ schema, total, processingDays }) {
  return (
    <div
      className="md:hidden fixed bottom-16 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur safe-area-pb"
      data-testid="apply-fee-sheet"
    >
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
            <div className="flex justify-between">
              <span className="text-ink-muted">Government fee</span>
              <span className="font-mono">{INR.format(schema.fees?.govt_fee || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Service fee</span>
              <span className="font-mono">{INR.format(schema.fees?.service_fee || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-medium">
              <span>Total</span>
              <span className="font-display text-xl text-navy">{INR.format(total)}</span>
            </div>
            <p className="text-xs text-ink-muted pt-2">Processing about {processingDays} days · no hidden charges</p>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function TravelerStep({
  traveler,
  setTraveler,
  profiles,
  onPrefill,
  saveAsProfile,
  setSaveAsProfile,
  passportMinMonths,
  passportValid,
}) {
  const upd = (k, v) => setTraveler((p) => ({ ...p, [k]: v }));
  const [scanning, setScanning] = useState(false);

  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api.post("/documents/scan-passport", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const d = r.data;
      setTraveler((prev) => ({
        ...prev,
        full_name: d.full_name || prev.full_name || "",
        passport_number: d.passport_number || prev.passport_number || "",
        dob: d.date_of_birth || prev.dob || "",
        passport_issue_date: d.passport_issue_date || prev.passport_issue_date || "",
        passport_expiry_date: d.passport_expiry_date || prev.passport_expiry_date || "",
        gender: d.gender || prev.gender || "",
      }));
      const filled = ["full_name", "passport_number", "date_of_birth", "passport_expiry_date"].filter((k) => d[k]).length;
      track("passport_scan_success", { fields: filled });
      toast.success(`Scanned ${filled} field(s) — please verify accuracy.`);
    } catch (err) {
      track("passport_scan_failed");
      toast.error(err.response?.data?.detail || "Couldn't read this passport. Please fill fields manually.");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4">
        <h2 className="font-display text-xl text-navy mb-0.5">Traveler details</h2>
        <p className="text-sm text-ink-muted">As per your passport. We only accept Indian passports.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <label
          className="group relative inline-flex items-center gap-2 text-sm bg-navy text-white rounded-full px-5 py-2.5 cursor-pointer hover:bg-navy/90 shadow-md transition-all hover:shadow-lg"
          data-testid="scan-passport-btn"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4 group-hover:scale-110 transition-transform" />}
          <span className="font-medium">{scanning ? "Reading passport…" : "Scan passport to autofill"}</span>
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={handleScan}
            disabled={scanning}
            data-testid="scan-passport-input"
          />
        </label>
        <span className="text-xs text-ink-muted self-center">Optional</span>
      </div>

      {profiles.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3" data-testid="prefill-panel">
          <User className="w-4 h-4 text-navy" />
          <span className="text-sm text-ink-muted">Prefill from a saved traveler:</span>
          <Select onChange={(e) => onPrefill(e.target.value)} defaultValue="" data-testid="prefill-select" className="w-auto min-w-[12rem]">
            <option value="">— Choose someone —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.relationship}) · {p.passport_number_masked || "no passport"}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
        <Field label="Full name (as on passport)" required>
          <Input data-testid="traveler-name" value={traveler.full_name || ""} onChange={(e) => upd("full_name", e.target.value)} />
        </Field>
        <Field label="Date of birth" required>
          <Input type="date" data-testid="traveler-dob" value={traveler.dob || ""} onChange={(e) => upd("dob", e.target.value)} />
        </Field>
        <Field label="Passport number" required>
          <Input
            data-testid="traveler-passport"
            value={traveler.passport_number || ""}
            onChange={(e) => upd("passport_number", e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Passport expiry" required>
          <Input
            type="date"
            data-testid="traveler-passport-expiry"
            value={traveler.passport_expiry_date || ""}
            onChange={(e) => upd("passport_expiry_date", e.target.value)}
          />
          {traveler.passport_expiry_date && !passportValid ? (
            <p className="text-xs text-danger mt-1" data-testid="passport-validity-error">
              Must be valid at least {passportMinMonths} more month{passportMinMonths === 1 ? "" : "s"} — please renew before applying.
            </p>
          ) : (
            <p className="text-xs text-ink-muted mt-1">
              Must be valid at least {passportMinMonths} month{passportMinMonths === 1 ? "" : "s"} from today.
            </p>
          )}
        </Field>
        <Field label="Passport issue date">
          <Input
            type="date"
            data-testid="traveler-issue"
            value={traveler.passport_issue_date || ""}
            onChange={(e) => upd("passport_issue_date", e.target.value)}
          />
        </Field>
        <Field label="Gender">
          <Select data-testid="traveler-gender" value={traveler.gender || ""} onChange={(e) => upd("gender", e.target.value)}>
            <option value="">Select…</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Phone" required>
          <Input type="tel" data-testid="traveler-phone" value={traveler.phone || ""} onChange={(e) => upd("phone", e.target.value)} />
        </Field>
        <Field label="Email" required>
          <Input type="email" data-testid="traveler-email" value={traveler.email || ""} onChange={(e) => upd("email", e.target.value)} />
        </Field>
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
  if (!schema.fields || schema.fields.length === 0) {
    return <div className="text-center py-8 text-ink-muted">No extra questions for this visa. You can continue.</div>;
  }
  const upd = (k, v) => setFields((p) => ({ ...p, [k]: v }));
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4">
        <h2 className="font-display text-xl text-navy mb-0.5">A few more details</h2>
        <p className="text-sm text-ink-muted">Specific to {schema.country_name}.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
        {schema.fields.map((f) => (
          <Field key={f.field_key} label={f.label} required={f.required}>
            {f.type === "dropdown" ? (
              <Select
                data-testid={`field-${f.field_key}`}
                value={fields[f.field_key] || ""}
                onChange={(e) => upd(f.field_key, e.target.value)}
              >
                <option value="">Select…</option>
                {(f.options || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            ) : f.type === "date" ? (
              <Input
                type="date"
                data-testid={`field-${f.field_key}`}
                value={fields[f.field_key] || ""}
                onChange={(e) => upd(f.field_key, e.target.value)}
              />
            ) : f.type === "number" ? (
              <Input
                type="number"
                data-testid={`field-${f.field_key}`}
                value={fields[f.field_key] || ""}
                onChange={(e) => upd(f.field_key, e.target.value)}
              />
            ) : (
              <Input
                data-testid={`field-${f.field_key}`}
                value={fields[f.field_key] || ""}
                onChange={(e) => upd(f.field_key, e.target.value)}
              />
            )}
          </Field>
        ))}
      </div>
    </div>
  );
}

function DocsStep({ schema, uploads, setUploads }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4">
        <h2 className="font-display text-xl text-navy mb-0.5">Upload your documents</h2>
        <p className="text-sm text-ink-muted">Files are private and encrypted. Only your consultant sees them.</p>
      </div>
      <div className="space-y-4">
        {(schema.documents || []).map((d) => (
          <DocUploader
            key={d.doc_key}
            doc={d}
            value={uploads[d.doc_key]}
            onUpload={(u) => setUploads((prev) => ({ ...prev, [d.doc_key]: u }))}
          />
        ))}
      </div>
    </div>
  );
}

function DocUploader({ doc, value, onUpload }) {
  const [busy, setBusy] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const { data: vaultOptions = [] } = useVaultByKey(doc.doc_key, Boolean(doc.vault_eligible));

  const reuseFromVault = (v) => {
    onUpload({
      file_url: v.file_url,
      filename: v.filename,
      storage_key: v.storage_key || null,
      size_mb: 0,
      from_vault: true,
    });
    setShowVault(false);
    track("vault_reuse", { doc_key: doc.doc_key, vault_id: v.id });
    toast.success(`Reused ${v.filename} from your vault`);
  };

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = (doc.max_size_mb || 5) * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`This file is too large — max ${doc.max_size_mb}MB`);
      return;
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const formats = doc.formats || [];
    if (formats.length && !formats.includes(ext)) {
      toast.error(`Format not allowed — use ${formats.join(", ").toUpperCase()}`);
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/documents/upload?doc_key=${encodeURIComponent(doc.doc_key)}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUpload(res.data);
      track("doc_upload_success", { doc_key: doc.doc_key });
      toast.success(`${doc.name} uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const inp = "w-full h-9 px-4 border border-border rounded-lg bg-white/80 text-sm text-ink outline-none focus:bg-white focus:ring-2 focus:ring-navy focus:border-navy transition-all shadow-sm";

  return (
    <div className="p-4 bg-surface border border-border rounded-xl" data-testid={`upload-${doc.doc_key}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-ink-muted shrink-0" />
            <span className="font-medium text-sm">{doc.name}</span>
            {!doc.required && <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Optional</span>}
            {value && (
              <Stamp tone="success" size="sm">
                Uploaded
              </Stamp>
            )}
          </div>
          {doc.description && <p className="text-xs text-ink-muted mt-1">{doc.description}</p>}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-[10px] font-mono uppercase text-ink-muted">
              {(doc.formats || []).join(", ")} · max {doc.max_size_mb}MB
            </p>
            {doc.sample_file_url && (
              <a
                href={doc.sample_file_url}
                target="_blank"
                rel="noreferrer"
                data-testid={`sample-${doc.doc_key}`}
                className="text-[10px] font-mono uppercase text-teal hover:underline inline-flex items-center gap-1"
              >
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
              <DocumentActions
                fileUrl={value.file_url}
                filename={value.filename}
                testIdPrefix={`apply-doc-${doc.doc_key}`}
              />
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col gap-1.5">
          {vaultOptions.length > 0 && (
            <Button type="button" variant="teal" size="sm" onClick={() => setShowVault(!showVault)} data-testid={`vault-${doc.doc_key}`}>
              <Archive className="w-3 h-3" /> Reuse from vault
            </Button>
          )}
          <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 text-sm border border-ink rounded-full px-4 py-2 hover:bg-ink hover:text-white transition-colors">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {value ? "Replace" : "Upload"}
            <input
              type="file"
              hidden
              accept={(doc.formats || []).map((f) => "." + f).join(",")}
              onChange={handle}
              data-testid={`upload-input-${doc.doc_key}`}
            />
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
                className="w-full text-left text-sm bg-white border border-border rounded-md p-2 hover:border-teal flex items-center justify-between gap-2"
                data-testid={`vault-item-${v.id.slice(0, 6)}`}
              >
                <span className="truncate">{v.filename}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono uppercase text-ink-muted">
                    {new Date(v.created_at).toLocaleDateString("en-IN")}
                  </span>
                  <DocumentActions
                    fileUrl={v.file_url}
                    filename={v.filename}
                    testIdPrefix={`vault-item-view-${v.id.slice(0, 6)}`}
                    showDownload={false}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ schema, traveler, fields, uploads }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-display text-xl text-navy mb-0.5">Review &amp; confirm</h2>
          <p className="text-sm text-ink-muted">Please verify all details before payment. Incorrect info leads to rejection.</p>
        </div>
      </div>
      <div className="space-y-6">
        <ReviewBlock title="Traveler">
          {Object.entries(traveler).map(([k, v]) => (v ? <ReviewRow key={k} label={humanizeKey(k)} value={v} /> : null))}
        </ReviewBlock>
        {(schema.fields || []).length > 0 && (
          <ReviewBlock title="Details">
            {schema.fields.map((f) => (
              <ReviewRow key={f.field_key} label={f.label} value={fields[f.field_key] || "—"} />
            ))}
          </ReviewBlock>
        )}
        <ReviewBlock title="Documents">
          {(schema.documents || []).map((d) => {
            const up = uploads[d.doc_key];
            return (
              <div key={d.doc_key} className="flex items-center justify-between px-4 py-3 text-sm gap-3 hover:bg-surface-card/50 transition-colors">
                <span className="text-ink-muted capitalize">{d.name}</span>
                <span className="flex flex-col items-end gap-1 min-w-0">
                  <span className="text-ink font-mono truncate max-w-[40ch] text-right font-medium">
                    {up?.filename || (d.required ? "MISSING" : "not provided")}
                  </span>
                  {up?.file_url && (
                    <DocumentActions
                      fileUrl={up.file_url}
                      filename={up.filename}
                      testIdPrefix={`review-doc-${d.doc_key}`}
                    />
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
      <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm gap-3 hover:bg-surface-card/50 transition-colors">
      <span className="text-ink-muted capitalize">{label}</span>
      <span className="text-ink font-mono truncate max-w-[60%] text-right font-medium">{value}</span>
    </div>
  );
}

function PaymentStep({ schema, total, submit, submitting }) {
  return (
    <div>
      <h2 className="font-display text-xl text-navy mb-1">Payment</h2>
      <p className="text-sm text-ink-muted mb-4">Government fee and service fee shown separately. No hidden charges.</p>
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
        <Button type="button" onClick={() => submit("success")} disabled={submitting} data-testid="pay-success" className="w-full" size="lg">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Pay {INR.format(total)}
        </Button>
        {ALLOW_MOCK_PAYMENT && (
          <button
            type="button"
            onClick={() => submit("failure")}
            disabled={submitting}
            data-testid="pay-failure"
            className="w-full py-2 text-sm text-ink-muted underline hover:text-ink"
          >
            Simulate a failed payment
          </button>
        )}
      </div>
    </div>
  );
}
