"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Check,
  CheckCircle2,
  ChevronUp,
  ExternalLink,
  FileText,
  Loader2,
  QrCode,
  Save,
  Smartphone,
  Upload,
  User,
} from "lucide-react";
import MobileUploadModal from "@/components/customer/mobile-upload-modal";
import MobileConnectFlow from "@/components/customer/mobile-connect-flow";
import { useDocumentSync } from "@/hooks/use-document-sync";
import api from "@/lib/api";
import DocumentActions from "@/components/ui/document-actions";
import { draftKey, getUser } from "@/lib/session";
import { INR, humanizeKey, cn } from "@/lib/utils";
import { computeFeeBreakdown } from "@/lib/productPricing";
import { track } from "@/lib/telemetry";
import { useTravelerProfiles, useVaultByKey, useVisaProduct } from "@/hooks/customer-api";
import Stamp from "@/components/ui/stamp";
import { Button } from "@/components/ui/button";
import { Card, ErrorState, Skeleton } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/phone-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { isValidPhone, normalizePhoneValue } from "@/lib/phone";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import PassportScanner from "@/components/passport/PassportScanner";
import OCRFieldStatus from "@/components/passport/OCRFieldStatus";
import { buildFieldStatuses } from "@/config/passportFieldMap";

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

  // Initialize draftId from URL parameter or sessionStorage
  const [draftId, setDraftId] = useState(() => {
    if (draftParam) return draftParam;
    if (typeof window !== "undefined" && productId) {
      return sessionStorage.getItem(draftKey(productId)) || null;
    }
    return null;
  });

  const [step, setStep] = useState(() => {
    if (typeof window !== "undefined") {
      const qStep = searchParams.get("step");
      if (qStep !== null) {
        const byKey = STEP_KEYS.indexOf(qStep);
        if (byKey >= 0) return byKey;
        if (!isNaN(Number(qStep))) {
          return Math.max(0, Math.min(STEPS.length - 1, Number(qStep)));
        }
      }
      if (productId) {
        const savedStep = sessionStorage.getItem(`vc_apply_step_${productId}`);
        if (savedStep !== null && !isNaN(Number(savedStep))) {
          return Math.max(0, Math.min(STEPS.length - 1, Number(savedStep)));
        }
      }
    }
    return 0;
  });

  const [traveler, setTraveler] = useState(() => {
    if (typeof window !== "undefined" && productId) {
      try {
        const cached = sessionStorage.getItem(`vc_apply_traveler_${productId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  const [fields, setFields] = useState(() => {
    if (typeof window !== "undefined" && productId) {
      try {
        const cached = sessionStorage.getItem(`vc_apply_fields_${productId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  const [uploads, setUploads] = useState(() => {
    if (typeof window !== "undefined" && productId) {
      try {
        const cached = sessionStorage.getItem(`vc_apply_uploads_${productId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [profileRelationship, setProfileRelationship] = useState("self");
  const [draftLoaded, setDraftLoaded] = useState(() => {
    if (draftParam) return false;
    if (typeof window !== "undefined" && productId && sessionStorage.getItem(draftKey(productId))) {
      return false;
    }
    return true;
  });
  const [prefilledUser, setPrefilledUser] = useState(false);

  // Stable upload session ID linking laptop and phone - prioritize query param on phone
  const [uploadSessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const qSession = searchParams.get("session_id");
      if (qSession) return qSession;
      const existing = sessionStorage.getItem(`vc_mobile_session_${productId}`);
      if (existing) return existing;
      const gen = draftParam || `mus_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem(`vc_mobile_session_${productId}`, gen);
      return gen;
    }
    return searchParams.get("session_id") || draftParam || "mus_default";
  });

  // Keep state synchronized to sessionStorage & URL query params continuously
  useEffect(() => {
    if (typeof window !== "undefined" && productId && step != null) {
      sessionStorage.setItem(`vc_apply_step_${productId}`, String(step));
      const url = new URL(window.location.href);
      if (!url.searchParams.get("mobile_connect") && url.searchParams.get("step") !== STEP_KEYS[step]) {
        url.searchParams.set("step", STEP_KEYS[step]);
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [step, productId]);

  useEffect(() => {
    if (typeof window !== "undefined" && productId && Object.keys(traveler).length > 0) {
      sessionStorage.setItem(`vc_apply_traveler_${productId}`, JSON.stringify(traveler));
    }
  }, [traveler, productId]);

  useEffect(() => {
    if (typeof window !== "undefined" && productId && Object.keys(fields).length > 0) {
      sessionStorage.setItem(`vc_apply_fields_${productId}`, JSON.stringify(fields));
    }
  }, [fields, productId]);

  useEffect(() => {
    if (typeof window !== "undefined" && productId && Object.keys(uploads).length > 0) {
      sessionStorage.setItem(`vc_apply_uploads_${productId}`, JSON.stringify(uploads));
    }
  }, [uploads, productId]);

  // Re-hydrate session uploads on laptop mount if any documents were uploaded via phone
  useEffect(() => {
    if (!uploadSessionId) return;
    let cancelled = false;
    const effDraft = draftId || (typeof window !== "undefined" ? sessionStorage.getItem(draftKey(productId)) : null);
    const draftQuery = effDraft ? `?draft_id=${encodeURIComponent(effDraft)}` : "";
    api
      .get(`/documents/session/${encodeURIComponent(uploadSessionId)}${draftQuery}`)
      .then((res) => {
        if (cancelled) return;
        const sessionDocs = res.data?.documents || {};
        const entries = Object.entries(sessionDocs);
        if (entries.length === 0) return;
        setUploads((prev) => {
          let changed = false;
          const next = { ...prev };
          entries.forEach(([k, doc]) => {
            if ((doc.status === "uploaded" || doc.file_url) && !next[k]) {
              next[k] = {
                file_url: doc.file_url || "",
                filename: doc.filename || doc.name || `${k}.jpg`,
                storage_key: doc.storage_key || null,
                from_mobile: true,
              };
              changed = true;
            }
          });
          if (changed && typeof window !== "undefined" && productId) {
            sessionStorage.setItem(`vc_apply_uploads_${productId}`, JSON.stringify(next));
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uploadSessionId, draftId, productId]);

  // Real-time listener: updates laptop document upload state immediately upon phone upload
  const handleLiveDocumentUpload = useCallback(
    (event) => {
      if (!event || !event.doc_key) return;

      const rawKey = event.doc_key;
      let matchedKey = rawKey;
      if (schema?.documents) {
        const directMatch = schema.documents.find((d) => d.doc_key === rawKey);
        if (!directMatch) {
          if (rawKey === "photo") {
            const photoDoc = schema.documents.find(
              (d) => d.doc_key.includes("photo") || d.doc_key.includes("photograph")
            );
            if (photoDoc) matchedKey = photoDoc.doc_key;
          } else if (rawKey === "passport_scan" || rawKey === "passport_bio") {
            const passDoc = schema.documents.find(
              (d) => d.doc_key.includes("passport") || d.doc_key.includes("bio")
            );
            if (passDoc) matchedKey = passDoc.doc_key;
          }
        }
      }

      setUploads((prev) => {
        if (prev[matchedKey]?.file_url === event.file_url && prev[matchedKey]?.file_url) {
          return prev;
        }
        const updated = {
          ...prev,
          [matchedKey]: {
            file_url: event.file_url || "",
            filename: event.filename || `${event.name || matchedKey}.jpg`,
            storage_key: event.storage_key || null,
            size_mb: event.size_mb || 0,
            from_mobile: true,
          },
          ...(matchedKey !== rawKey
            ? {
                [rawKey]: {
                  file_url: event.file_url || "",
                  filename: event.filename || `${event.name || rawKey}.jpg`,
                  storage_key: event.storage_key || null,
                  size_mb: event.size_mb || 0,
                  from_mobile: true,
                },
              }
            : {}),
        };

        if (typeof window !== "undefined") {
          sessionStorage.setItem(`vc_apply_uploads_${productId}`, JSON.stringify(updated));
        }

        // Auto-patch backend draft so document status is never lost
        const activeDraftId =
          draftId ||
          (typeof window !== "undefined" ? sessionStorage.getItem(draftKey(productId)) : null);
        if (activeDraftId) {
          const uploadsList = Object.entries(updated).map(([k, u]) => ({
            doc_key: k,
            file_url: u.file_url,
            filename: u.filename,
            storage_key: u.storage_key || null,
          }));
          api
            .patch(`/cases/drafts/${activeDraftId}`, {
              document_uploads: uploadsList,
            })
            .catch(() => {});
        }

        return updated;
      });

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal" />
          <span>{event.name || "Document"} uploaded from phone!</span>
        </div>
      );
      track("mobile_upload_sync_received", { product_id: productId, doc_key: matchedKey });
    },
    [productId, schema, draftId]
  );

  useDocumentSync(uploadSessionId, handleLiveDocumentUpload);

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

  // Resume a saved draft when draftId is present (URL query or sessionStorage).
  useEffect(() => {
    const effectiveDraftId =
      draftParam ||
      draftId ||
      (typeof window !== "undefined" ? sessionStorage.getItem(draftKey(productId)) : null);

    if (!effectiveDraftId) {
      setDraftLoaded(true);
      return;
    }

    let cancelled = false;
    api
      .get(`/cases/drafts/${effectiveDraftId}`)
      .then((r) => {
        if (cancelled) return;
        const d = r.data;
        const t = d.traveler || {};
        const normTraveler = { ...t, phone: normalizePhoneValue(t.phone || "") };
        setTraveler((prev) => ({ ...normTraveler, ...prev }));
        setFields((prev) => ({ ...(d.field_values || {}), ...prev }));

        const um = {};
        (d.document_uploads || []).forEach((u) => {
          if (u.doc_key) {
            um[u.doc_key] = {
              file_url: u.file_url,
              filename: u.filename,
              storage_key: u.storage_key || u.key || null,
              size_mb: 0,
            };
          }
        });

        // Merge with any uploads already in state/sessionStorage so live uploads are not wiped
        setUploads((prev) => {
          const merged = { ...um, ...prev };
          if (typeof window !== "undefined") {
            sessionStorage.setItem(`vc_apply_uploads_${productId}`, JSON.stringify(merged));
          }
          return merged;
        });

        setDraftId(d.id);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(draftKey(productId), d.id);
          // Sync browser URL with ?draft= parameter without reloading
          const url = new URL(window.location.href);
          if (url.searchParams.get("draft") !== d.id && !url.searchParams.get("mobile_connect")) {
            url.searchParams.set("draft", d.id);
            window.history.replaceState({}, "", url.pathname + url.search);
          }
        }

        const savedStep =
          typeof window !== "undefined"
            ? sessionStorage.getItem(`vc_apply_step_${productId}`)
            : null;
        const qStep = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("step") : null;
        const urlStepIdx = qStep ? STEP_KEYS.indexOf(qStep) : -1;
        const draftStepIdx = STEP_KEYS.indexOf(d.step);
        const resolvedStep =
          urlStepIdx >= 0
            ? urlStepIdx
            : savedStep !== null && !isNaN(Number(savedStep))
            ? Math.max(0, Math.min(STEPS.length - 1, Number(savedStep)))
            : draftStepIdx >= 0
            ? draftStepIdx
            : 0;
        setStep(resolvedStep);
        track("apply_draft_resumed", { product_id: productId, draft_id: d.id, step: d.step });
      })
      .catch(() => {
        // Retain saved step and local data; don't reset to 0
      })
      .finally(() => {
        if (!cancelled) setDraftLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [draftParam, productId]);

  useEffect(() => {
    if (draftId && productId && typeof window !== "undefined") {
      sessionStorage.setItem(draftKey(productId), draftId);
    }
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
    let id =
      draftId ||
      (typeof window !== "undefined" ? sessionStorage.getItem(draftKey(productId)) : null);
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

    if (typeof window !== "undefined") {
      sessionStorage.setItem(draftKey(productId), id);
      const stepIdx = STEP_KEYS.indexOf(stepKey);
      if (stepIdx >= 0) {
        sessionStorage.setItem(`vc_apply_step_${productId}`, String(stepIdx));
      }
      sessionStorage.setItem(`vc_apply_uploads_${productId}`, JSON.stringify(uploads));

      // Keep the browser URL updated with ?draft= and ?step= so refresh stays on this draft & step
      const url = new URL(window.location.href);
      if (!url.searchParams.get("mobile_connect")) {
        if (url.searchParams.get("draft") !== id) {
          url.searchParams.set("draft", id);
        }
        url.searchParams.set("step", stepKey);
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
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
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`vc_apply_step_${productId}`, String(next));
      }
    } catch (e) {
      if (e.response?.status === 410) {
        handleProductGone();
      } else {
        toast.error("Couldn't save your progress, but you can continue.");
        setStep(next);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`vc_apply_step_${productId}`, String(next));
        }
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
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`vc_apply_step_${productId}`, String(prev));
      }
    } catch (e) {
      if (e.response?.status === 410) {
        handleProductGone();
      } else {
        toast.error("Couldn't save your progress, but you can go back.");
        setStep(prev);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`vc_apply_step_${productId}`, String(prev));
        }
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
        nationality: p.nationality || "",
        phone: normalizePhoneValue(p.phone || ""),
        email: p.email || "",
      });
      if (p.relationship) setProfileRelationship(p.relationship);
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

  const feeBreakdown = computeFeeBreakdown({
    govtFee: schema.fees?.govt_fee,
    serviceFee: schema.fees?.service_fee,
  });
  const requiredDocs = (schema.documents || []).filter((d) => d.required);
  const allRequiredUploaded = requiredDocs.every((d) => uploads[d.doc_key]);
  const requiredFields = (schema.fields || []).filter((f) => f.required);
  const allFieldsFilled = requiredFields.every((f) => (fields[f.field_key] || "").trim() !== "");

  const requiredTravelerFields = ["full_name", "dob", "passport_number", "passport_expiry_date", "phone", "email"];
  const passportMinMonths = schema.passport_min_validity_months || 6;
  const passportMinDate = new Date();
  passportMinDate.setMonth(passportMinDate.getMonth() + passportMinMonths);
  const passportValid = traveler.passport_expiry_date ? new Date(traveler.passport_expiry_date) >= passportMinDate : false;
  const phoneValid = isValidPhone(traveler.phone);
  const travelerReady =
    requiredTravelerFields.every((k) => (traveler[k] || "").trim() !== "") && passportValid && phoneValid;

  const continueBlocked =
    (step === 0 && !travelerReady) || (step === 1 && !allFieldsFilled) || (step === 2 && !allRequiredUploaded);

  const blockedHint = (() => {
    if (!continueBlocked) return null;
    if (step === 0) {
      if (traveler.passport_expiry_date && !passportValid) {
        return `Passport must be valid at least ${passportMinMonths} more month${passportMinMonths === 1 ? "" : "s"}`;
      }
      if ((traveler.phone || "").trim() && !phoneValid) {
        return "Enter a valid phone number for the selected country";
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
              relationship: profileRelationship || "self",
              dob: traveler.dob,
              passport_number: traveler.passport_number,
              passport_issue_date: traveler.passport_issue_date,
              passport_expiry_date: traveler.passport_expiry_date,
              gender: traveler.gender,
              nationality: traveler.nationality || null,
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

  const isMobileConnect = searchParams.get("mobile_connect") === "1";
  if (isMobileConnect) {
    const qSession = searchParams.get("session_id");
    const qDraft = searchParams.get("draft");
    return (
      <MobileConnectFlow
        productId={productId}
        draftId={qDraft || draftId || draftParam}
        sessionId={qSession || uploadSessionId}
        schema={schema}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-2 md:py-3 pb-20 md:pb-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-4xl md:text-5xl shrink-0 drop-shadow-sm">{schema.country_flag}</span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-4xl text-navy leading-tight truncate">{schema.title}</h1>
            <div className="text-xs font-mono uppercase tracking-widest text-ink-muted mt-1.5 hidden md:block">
              Processing {schema.processing_time_days} days · {INR.format(feeBreakdown.total)}
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
                    profileRelationship={profileRelationship}
                    setProfileRelationship={setProfileRelationship}
                    passportMinMonths={passportMinMonths}
                    passportValid={passportValid}
                  />
                )}
                {step === 1 && <FieldsStep schema={schema} fields={fields} setFields={setFields} />}
                {step === 2 && (
                  <DocsStep
                    schema={schema}
                    uploads={uploads}
                    setUploads={setUploads}
                    productId={productId}
                    draftId={draftId}
                    sessionId={uploadSessionId}
                  />
                )}
                {step === 3 && <ReviewStep schema={schema} traveler={traveler} fields={fields} uploads={uploads} />}
                {step === 4 && <PaymentStep breakdown={feeBreakdown} submit={submit} submitting={submitting} />}
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

      <ApplyFeeSheet breakdown={feeBreakdown} processingDays={schema.processing_time_days} />
    </div>
  );
}

function ApplyFeeSheet({ breakdown, processingDays }) {
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
              <div className="font-display text-lg text-navy">{INR.format(breakdown.total)}</div>
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
              <span className="text-ink-muted">Government fee (incl. GST)</span>
              <span className="font-mono">{INR.format(breakdown.govtFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Service fee (excl. GST)</span>
              <span className="font-mono">{INR.format(breakdown.serviceFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">GST on service ({breakdown.gstPercent}%)</span>
              <span className="font-mono">{INR.format(breakdown.serviceGst)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-medium">
              <span>Total</span>
              <span className="font-display text-xl text-navy">{INR.format(breakdown.total)}</span>
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
  profileRelationship,
  setProfileRelationship,
  passportMinMonths,
  passportValid,
}) {
  const [ocrStatuses, setOcrStatuses] = useState({});
  const upd = (k, v) => {
    setOcrStatuses((s) => {
      if (!s[k]) return s;
      const next = { ...s };
      delete next[k];
      return next;
    });
    setTraveler((p) => ({ ...p, [k]: v }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4">
        <h2 className="font-display text-xl text-navy mb-0.5">Traveler details</h2>
        <p className="text-sm text-ink-muted">As per your passport. We only accept Indian passports.</p>
      </div>

      <PassportScanner
        traveler={traveler}
        setTraveler={setTraveler}
        onStatuses={(data) => setOcrStatuses(buildFieldStatuses(data))}
        onManual={() => setOcrStatuses({})}
      />

      {profiles.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3" data-testid="prefill-panel">
          <User className="w-4 h-4 text-navy" />
          <span className="text-sm text-ink-muted">Prefill from a saved traveler:</span>
          <SearchableSelect
            data-testid="prefill-select"
            className="w-auto min-w-[12rem]"
            clearable={false}
            placeholder="— Choose someone —"
            searchPlaceholder="Search travelers…"
            value=""
            onChange={(v) => { if (v) onPrefill(v); }}
            options={profiles.map((p) => ({
              value: p.id,
              label: `${p.full_name} (${p.relationship}) · ${p.passport_number_masked || "no passport"}`,
            }))}
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
        <Field label="Full name (as on passport)" required>
          <Input data-testid="traveler-name" value={traveler.full_name || ""} onChange={(e) => upd("full_name", e.target.value)} />
          <OCRFieldStatus status={ocrStatuses.full_name} />
        </Field>
        <Field label="Date of birth" required>
          <DatePicker
            data-testid="traveler-dob"
            value={traveler.dob || null}
            onChange={(v) => upd("dob", v || "")}
            fromYear={1940}
            toYear={new Date().getFullYear()}
            clearable={false}
          />
          <OCRFieldStatus status={ocrStatuses.dob} />
        </Field>
        <Field label="Passport number" required>
          <Input
            data-testid="traveler-passport"
            value={traveler.passport_number || ""}
            onChange={(e) => upd("passport_number", e.target.value.toUpperCase())}
          />
          <OCRFieldStatus status={ocrStatuses.passport_number} />
        </Field>
        <Field label="Passport expiry" required>
          <DatePicker
            data-testid="traveler-passport-expiry"
            value={traveler.passport_expiry_date || null}
            onChange={(v) => upd("passport_expiry_date", v || "")}
            fromYear={new Date().getFullYear() - 1}
            toYear={new Date().getFullYear() + 20}
            clearable={false}
          />
          <OCRFieldStatus status={ocrStatuses.passport_expiry_date} />
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
          <DatePicker
            data-testid="traveler-issue"
            value={traveler.passport_issue_date || null}
            onChange={(v) => upd("passport_issue_date", v || "")}
            fromYear={1990}
            toYear={new Date().getFullYear()}
          />
          <OCRFieldStatus status={ocrStatuses.passport_issue_date} />
        </Field>
        <Field label="Gender">
          <SearchableSelect
            data-testid="traveler-gender"
            clearable
            placeholder="Select…"
            searchPlaceholder="Search…"
            value={traveler.gender || null}
            onChange={(v) => upd("gender", v || "")}
            options={[
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
            ]}
          />
          <OCRFieldStatus status={ocrStatuses.gender} />
        </Field>
        <Field label="Nationality">
          <SearchableSelect
            data-testid="traveler-nationality"
            clearable
            placeholder="Select…"
            searchPlaceholder="Search…"
            value={traveler.nationality || null}
            onChange={(v) => upd("nationality", v || "")}
            options={[
              { value: "IND", label: "Indian (IND)" },
              { value: "NPL", label: "Nepalese (NPL)" },
              { value: "BGD", label: "Bangladeshi (BGD)" },
              { value: "LKA", label: "Sri Lankan (LKA)" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <OCRFieldStatus status={ocrStatuses.nationality} />
        </Field>
        <Field label="Phone" required>
          <PhoneField
            variant="static"
            data-testid="traveler-phone"
            value={traveler.phone || ""}
            onChange={(v) => upd("phone", v)}
            error={(traveler.phone || "").trim() && !isValidPhone(traveler.phone) ? "Invalid for selected country" : undefined}
          />
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
      {saveAsProfile && (
        <div className="mt-3 max-w-xs" data-testid="profile-relationship-wrap">
          <Field label="Relationship to account contact">
            <SearchableSelect
              data-testid="profile-relationship"
              clearable={false}
              value={profileRelationship || "self"}
              onChange={(v) => setProfileRelationship(v || "self")}
              options={[
                { value: "self", label: "Self" },
                { value: "spouse", label: "Spouse" },
                { value: "child", label: "Child" },
                { value: "parent", label: "Parent" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <p className="text-xs text-ink-muted mt-1">
            Your account stays the contact person; this traveler can be a family member.
          </p>
        </div>
      )}
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
              <SearchableSelect
                data-testid={`field-${f.field_key}`}
                clearable={!f.required}
                placeholder="Select…"
                searchPlaceholder="Search options…"
                value={fields[f.field_key] || null}
                onChange={(v) => upd(f.field_key, v || "")}
                options={(f.options || []).map((o) => ({ value: o, label: o }))}
              />
            ) : f.type === "date" ? (
              <DatePicker
                data-testid={`field-${f.field_key}`}
                value={fields[f.field_key] || null}
                onChange={(v) => upd(f.field_key, v || "")}
                clearable={!f.required}
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

function DocsStep({ schema, uploads, setUploads, productId, draftId, sessionId }) {
  const [showMobileModal, setShowMobileModal] = useState(false);

  // Compute dynamic progress on desktop
  const requiredDocs = (schema.documents || []).filter((d) => d.required !== false);
  const totalCount = requiredDocs.length || (schema.documents || []).length;
  const uploadedCount = requiredDocs.filter((d) => uploads[d.doc_key]).length;
  const progressPct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 100;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4">
        <h2 className="font-display text-xl text-navy mb-0.5">Upload your documents</h2>
        <p className="text-sm text-ink-muted">Files are private and encrypted. Only your consultant sees them.</p>
      </div>

      {/* Desktop Real-time Progress Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 border border-border/80 shadow-xs mb-5">
        <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
          <span className="font-medium text-navy">
            {uploadedCount} of {totalCount} uploaded
          </span>
          <span className="font-mono font-semibold text-teal text-xs tracking-wider">
            {progressPct}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full bg-teal rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {(schema.documents || []).map((d) => (
          <DocUploader
            key={d.doc_key}
            doc={d}
            value={uploads[d.doc_key]}
            sessionId={sessionId}
            onUpload={(u) => {
              setUploads((prev) => {
                const updated = { ...prev, [d.doc_key]: u };
                if (typeof window !== "undefined") {
                  sessionStorage.setItem(`vc_apply_uploads_${productId}`, JSON.stringify(updated));
                }

                // Immediately sync to backend upload session manager so phone QR sees it
                if (sessionId) {
                  api
                    .post("/documents/notify-upload", {
                      session_id: sessionId,
                      doc_key: d.doc_key,
                      document_type: d.doc_key,
                      name: d.name,
                      status: "uploaded",
                      file_url: u.file_url || "",
                      filename: u.filename || `${d.doc_key}.jpg`,
                      storage_key: u.storage_key || null,
                    })
                    .catch(() => {});
                }

                // Auto-patch backend draft immediately if draftId exists
                const activeDraftId =
                  draftId ||
                  (typeof window !== "undefined" ? sessionStorage.getItem(draftKey(productId)) : null);
                if (activeDraftId) {
                  const uploadsList = Object.entries(updated).map(([k, up]) => ({
                    doc_key: k,
                    file_url: up.file_url,
                    filename: up.filename,
                    storage_key: up.storage_key || null,
                  }));
                  api
                    .patch(`/cases/drafts/${activeDraftId}`, {
                      document_uploads: uploadsList,
                    })
                    .catch(() => {});
                }

                return updated;
              });
            }}
          />
        ))}
      </div>

      {/* Upload from Mobile Option */}
      <div className="mt-6 pt-5 border-t border-border/70">
        <div className="rounded-2xl border border-dashed border-border-strong/90 bg-surface-card/90 hover:bg-surface-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-xs hover:border-teal/60 hover:shadow-card">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-teal/10 text-teal flex items-center justify-center shrink-0 shadow-xs border border-teal/15">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-navy">Upload from Mobile</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold uppercase bg-teal/10 text-teal border border-teal/20">
                  Phone Camera
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                Scan a QR code to securely connect your phone and upload required documents in real time.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowMobileModal(true)}
            data-testid="upload-from-mobile-trigger"
            className="shrink-0 rounded-full px-5 py-2 text-xs font-medium border-border-strong hover:border-navy hover:text-navy hover:bg-navy/5 transition-all cursor-pointer shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            Upload from Mobile
          </Button>
        </div>
      </div>

      {/* Mobile Upload Modal */}
      <MobileUploadModal
        open={showMobileModal}
        onOpenChange={setShowMobileModal}
        productId={productId}
        draftId={draftId}
        sessionId={sessionId}
        uploadedDocs={uploads}
        totalCount={totalCount}
      />
    </div>
  );
}

function DocUploader({ doc, value, sessionId, onUpload }) {
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
    if (sessionId) {
      api
        .post("/documents/notify-upload", {
          session_id: sessionId,
          doc_key: doc.doc_key,
          document_type: doc.doc_key,
          name: doc.name,
          status: "uploaded",
          file_url: v.file_url,
          filename: v.filename,
        })
        .catch(() => {});
    }
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
      const url = `/documents/upload?doc_key=${encodeURIComponent(doc.doc_key)}${
        sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ""
      }`;
      const res = await api.post(url, form, {
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
            {value ? (
              <Stamp tone="success" size="sm" className="inline-flex items-center gap-1 font-medium">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Uploaded</span>
                {value.from_mobile && (
                  <span className="text-[9px] font-mono text-teal-light opacity-90">(phone)</span>
                )}
              </Stamp>
            ) : (
              <span className="text-xs text-ink-subtle">Not uploaded</span>
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
            const rawKey = d.doc_key;
            const up =
              uploads[rawKey] ||
              (rawKey.includes("passport") || rawKey.includes("bio")
                ? uploads["passport_scan"] || uploads["passport_bio"] || uploads["passport"]
                : null) ||
              (rawKey.includes("photo")
                ? uploads["photo"] || uploads["passport_photo"] || uploads["photograph"]
                : null) ||
              (rawKey.includes("bank")
                ? uploads["bank_statement"]
                : null);
            const isUploaded = Boolean(up?.file_url || up?.filename);

            return (
              <div key={d.doc_key} className="flex items-center justify-between px-4 py-3 text-sm gap-3 hover:bg-surface-card/50 transition-colors">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-ink-muted capitalize">{d.name}</span>
                  {isUploaded && (
                    <Stamp tone="success" size="sm" className="inline-flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>Uploaded</span>
                      {up.from_mobile && (
                        <span className="text-[9px] font-mono text-teal-light opacity-90">(phone)</span>
                      )}
                    </Stamp>
                  )}
                </div>
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

function PaymentStep({ breakdown, submit, submitting }) {
  return (
    <div>
      <h2 className="font-display text-xl text-navy mb-1">Payment</h2>
      <p className="text-sm text-ink-muted mb-4">Government fee includes GST; service fee excludes GST and is shown separately. No hidden charges.</p>
      <div className="bg-surface border border-border rounded-xl p-6 max-w-md mx-auto">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-ink-muted">Government fee (incl. GST)</span>
          <span className="font-mono">{INR.format(breakdown.govtFee)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-ink-muted">Service fee (excl. GST)</span>
          <span className="font-mono">{INR.format(breakdown.serviceFee)}</span>
        </div>
        <div className="flex justify-between text-sm mb-4 pb-4 border-b border-border">
          <span className="text-ink-muted">GST on service ({breakdown.gstPercent}%)</span>
          <span className="font-mono">{INR.format(breakdown.serviceGst)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="font-medium">Total</span>
          <span className="font-display text-3xl text-navy">{INR.format(breakdown.total)}</span>
        </div>
      </div>
      <div className="mt-6 max-w-md mx-auto space-y-3">
        <div className="text-center text-xs font-mono uppercase text-ink-muted">Mock payment · replace with real gateway later</div>
        <Button type="button" onClick={() => submit("success")} disabled={submitting} data-testid="pay-success" className="w-full" size="lg">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Pay {INR.format(breakdown.total)}
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
