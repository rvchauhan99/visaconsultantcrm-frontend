"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  User,
  AlertCircle,
  Sparkles,
  BookOpen,
  Landmark,
  File,
} from "lucide-react";
import { toast } from "sonner";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detectFaceInImage } from "@/lib/face-detection";
import { useVisaProduct } from "@/hooks/customer-api";
import { useDocumentSync } from "@/hooks/use-document-sync";
import api from "@/lib/api";

/**
 * MobileConnectFlow implements the dynamic phone experience when scanned via QR code.
 *
 * Dynamically loads and renders required and optional documents for the currently selected
 * visa product, calculates progress dynamically (e.g. 0/2 -> 50% -> 100%, or 0/4 -> 25% -> 50% -> ...),
 * and dispatches live events to the laptop in real-time.
 */
export default function MobileConnectFlow({ productId, draftId, sessionId: propSessionId, schema: propSchema }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If schema was not passed down from parent, fetch it dynamically using the productId
  const { data: fetchedSchema, isLoading: schemaLoading } = useVisaProduct(productId);
  const schema = propSchema || fetchedSchema;

  // Session ID connecting phone and laptop - prioritize QR query param
  const effectiveSessionId =
    searchParams.get("session_id") || propSessionId || draftId || "mus_default";

  const effectiveDraftId = searchParams.get("draft") || draftId || null;

  // Active view:
  // "document_list" | "photo_loading" | "photo_upload" | "photo_preview"
  // | "passport_loading" | "passport_upload" | "passport_preview"
  // | "generic_loading" | "generic_upload" | "generic_preview"
  const [currentView, setCurrentView] = useState("document_list");

  // The active document currently selected for upload
  const [activeDoc, setActiveDoc] = useState(null);

  // Dynamic document upload states: { [doc_key]: { uploaded: boolean, previewUrl, file, name } }
  const [uploadedDocs, setUploadedDocs] = useState(() => {
    if (typeof window !== "undefined" && productId) {
      try {
        const cached = sessionStorage.getItem(`vc_mobile_uploads_${productId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  // Seed mobile state from session cache & draft on mount
  useEffect(() => {
    let cancelled = false;

    const loadInitialDocuments = async () => {
      const initialMap = {};

      // 1. Fetch from session state cache (documents already uploaded from laptop)
      if (effectiveSessionId) {
        try {
          const draftQuery = effectiveDraftId ? `?draft_id=${encodeURIComponent(effectiveDraftId)}` : "";
          const res = await api.get(`/documents/session/${encodeURIComponent(effectiveSessionId)}${draftQuery}`);
          const sessionDocs = res.data?.documents || {};
          Object.entries(sessionDocs).forEach(([k, doc]) => {
            if (doc.status === "uploaded" || doc.file_url) {
              let targetKey = k;
              if (schema?.documents) {
                const direct = schema.documents.find((d) => d.doc_key === k);
                if (!direct) {
                  if (k === "photo") {
                    const match = schema.documents.find((d) => d.doc_key.includes("photo") || d.doc_key.includes("photograph"));
                    if (match) targetKey = match.doc_key;
                  } else if (k.includes("passport") || k.includes("bio")) {
                    const match = schema.documents.find((d) => d.doc_key.includes("passport") || d.doc_key.includes("bio"));
                    if (match) targetKey = match.doc_key;
                  }
                }
              }
              initialMap[targetKey] = {
                uploaded: true,
                previewUrl: doc.file_url || "",
                name: doc.name || doc.filename || targetKey,
              };
              if (targetKey !== k) {
                initialMap[k] = initialMap[targetKey];
              }
            }
          });
        } catch {}
      }

      // 2. Fetch from draft if draftId is present
      if (effectiveDraftId) {
        try {
          const draftRes = await api.get(
            `/cases/drafts/${encodeURIComponent(effectiveDraftId)}?session_id=${encodeURIComponent(effectiveSessionId)}`
          );
          const draftDocs = draftRes.data?.document_uploads || [];
          draftDocs.forEach((doc) => {
            if (doc.file_url || doc.filename) {
              let targetKey = doc.doc_key;
              if (schema?.documents) {
                const direct = schema.documents.find((d) => d.doc_key === targetKey);
                if (!direct) {
                  if (targetKey === "photo") {
                    const match = schema.documents.find((d) => d.doc_key.includes("photo") || d.doc_key.includes("photograph"));
                    if (match) targetKey = match.doc_key;
                  } else if (targetKey.includes("passport") || targetKey.includes("bio")) {
                    const match = schema.documents.find((d) => d.doc_key.includes("passport") || d.doc_key.includes("bio"));
                    if (match) targetKey = match.doc_key;
                  }
                }
              }
              initialMap[targetKey] = {
                uploaded: true,
                previewUrl: doc.file_url || "",
                name: doc.filename || targetKey,
              };
              if (targetKey !== doc.doc_key) {
                initialMap[doc.doc_key] = initialMap[targetKey];
              }
            }
          });
        } catch {}
      }

      if (!cancelled && Object.keys(initialMap).length > 0) {
        setUploadedDocs((prev) => {
          const merged = { ...initialMap, ...prev };
          if (typeof window !== "undefined" && productId) {
            sessionStorage.setItem(`vc_mobile_uploads_${productId}`, JSON.stringify(merged));
          }
          return merged;
        });
      }
    };

    loadInitialDocuments();

    return () => {
      cancelled = true;
    };
  }, [effectiveSessionId, effectiveDraftId, productId, schema]);

  // Real-time synchronization for documents uploaded from laptop
  useDocumentSync(effectiveSessionId, (event) => {
    if (!event || !event.doc_key) return;
    const rawKey = event.doc_key;
    let matchedKey = rawKey;
    if (schema?.documents) {
      const direct = schema.documents.find((d) => d.doc_key === rawKey);
      if (direct) matchedKey = direct.doc_key;
    }
    setUploadedDocs((prev) => {
      const next = {
        ...prev,
        [matchedKey]: {
          uploaded: true,
          previewUrl: event.file_url || "",
          name: event.name || matchedKey,
        },
      };
      if (typeof window !== "undefined" && productId) {
        sessionStorage.setItem(`vc_mobile_uploads_${productId}`, JSON.stringify(next));
      }
      return next;
    });
  });

  // Staging state during photo capture/preview
  const [selectedImage, setSelectedImage] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Staging state during generic/passport document capture/preview
  const [selectedDocFile, setSelectedDocFile] = useState(null); // { file, previewUrl, name, isPdf }

  // File input refs
  const photoCameraInputRef = useRef(null);
  const photoGalleryInputRef = useRef(null);
  const passportCameraInputRef = useRef(null);
  const passportGalleryInputRef = useRef(null);
  const genericCameraInputRef = useRef(null);
  const genericFileInputRef = useRef(null);

  // Dynamic documents list derived from schema
  const documents = useMemo(() => {
    return schema?.documents || [];
  }, [schema]);

  // Separate required documents for progress calculation
  const requiredDocs = useMemo(() => {
    return documents.filter((d) => d.required !== false);
  }, [documents]);

  const totalRequiredCount = requiredDocs.length || documents.length;
  const uploadedRequiredCount = useMemo(() => {
    return requiredDocs.filter((d) => uploadedDocs[d.doc_key]?.uploaded).length;
  }, [requiredDocs, uploadedDocs]);

  // Dynamic percentage calculation
  const progressPct =
    totalRequiredCount > 0
      ? Math.round((uploadedRequiredCount / totalRequiredCount) * 100)
      : 100;

  // Helper to choose an appropriate icon based on document key / name
  const getDocumentIcon = (doc) => {
    const key = (doc?.doc_key || "").toLowerCase();
    const name = (doc?.name || "").toLowerCase();

    if (key.includes("photo") || name.includes("photo")) {
      return Camera;
    }
    if (key.includes("passport") || name.includes("passport") || key.includes("bio")) {
      return BookOpen;
    }
    if (key.includes("bank") || name.includes("bank") || key.includes("statement")) {
      return Landmark;
    }
    if (key.includes("flight") || key.includes("ticket") || name.includes("flight")) {
      return FileSpreadsheet;
    }
    return FileText;
  };

  // Helper to determine document upload flow type
  const getDocFlowType = (doc) => {
    const key = (doc?.doc_key || "").toLowerCase();
    const name = (doc?.name || "").toLowerCase();

    if (key === "photo" || key.includes("photograph") || (name.includes("photo") && !name.includes("passport bio"))) {
      return "photo";
    }
    if (key === "passport_scan" || key.includes("passport") || name.includes("passport")) {
      return "passport";
    }
    return "generic";
  };

  // Broadcasts document upload event to backend and laptop
  const broadcastUploadToLaptop = async (docKey, name, file, previewUrl) => {
    let finalFileUrl = previewUrl || "";
    let storageKey = null;

    // 1. Upload file to backend storage using QR session authorization
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await api.post(
          `/documents/upload?doc_key=${encodeURIComponent(docKey)}&session_id=${encodeURIComponent(effectiveSessionId)}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        if (uploadRes.data?.file_url) {
          finalFileUrl = uploadRes.data.file_url;
          storageKey = uploadRes.data.key || null;
        }
      } catch (err) {
        console.warn("Storage upload warning, using local preview for notification:", err);
      }
    }

    // Calculate new required count after this upload
    const updatedUploaded = {
      ...uploadedDocs,
      [docKey]: { uploaded: true, previewUrl: finalFileUrl, file, name, storage_key: storageKey },
    };
    if (typeof window !== "undefined" && productId) {
      sessionStorage.setItem(`vc_mobile_uploads_${productId}`, JSON.stringify(updatedUploaded));
    }
    const newUploadedRequired = requiredDocs.filter((d) => updatedUploaded[d.doc_key]?.uploaded).length;
    const newProgress =
      totalRequiredCount > 0
        ? Math.round((newUploadedRequired / totalRequiredCount) * 100)
        : 100;

    // 2. Send real-time notification to backend WebSocket hub
    try {
      await api.post("/documents/notify-upload", {
        session_id: effectiveSessionId,
        doc_key: docKey,
        document_type: docKey,
        name: name,
        status: "uploaded",
        file_url: finalFileUrl,
        filename: file?.name || `${docKey}.jpg`,
        storage_key: storageKey,
        progress: newProgress,
      });
    } catch (err) {
      console.warn("Real-time notify error:", err);
    }

    // 3. Keep backend draft updated if effectiveDraftId is available
    if (effectiveDraftId) {
      try {
        const docsList = Object.entries(updatedUploaded).map(([k, u]) => ({
          doc_key: k,
          file_url: u.previewUrl || "",
          filename: u.file?.name || u.name || `${k}.jpg`,
          storage_key: u.storage_key || null,
        }));
        api
          .patch(`/cases/drafts/${effectiveDraftId}?session_id=${encodeURIComponent(effectiveSessionId)}`, {
            document_uploads: docsList,
          })
          .catch(() => {});
      } catch {}
    }
  };

  // ==========================================
  // DOCUMENT TASK CLICK HANDLER (DYNAMIC ROUTING)
  // ==========================================
  const handleOpenDocTask = (doc) => {
    setActiveDoc(doc);
    const flowType = getDocFlowType(doc);

    if (flowType === "photo") {
      setCurrentView("photo_loading");
      const timer = setTimeout(() => {
        setCurrentView("photo_upload");
      }, 900);
      return () => clearTimeout(timer);
    } else if (flowType === "passport") {
      setCurrentView("passport_loading");
      const timer = setTimeout(() => {
        setCurrentView("passport_upload");
      }, 900);
      return () => clearTimeout(timer);
    } else {
      // Generic document flow
      setCurrentView("generic_loading");
      const timer = setTimeout(() => {
        setCurrentView("generic_upload");
      }, 800);
      return () => clearTimeout(timer);
    }
  };

  // ==========================================
  // 1. PASSPORT-SIZE PHOTOGRAPH FLOW
  // ==========================================
  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const previewUrl = URL.createObjectURL(file);
    setSelectedImage({ file, previewUrl, name: file.name });
    setCurrentView("photo_preview");
    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await detectFaceInImage(file);
      setValidationResult(result);
    } catch (err) {
      console.error("Face detection failed:", err);
      setValidationResult({
        detected: false,
        message:
          "We couldn't detect a face in this photo. Please upload a clear photo showing your face.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAcceptPhoto = async () => {
    if (!selectedImage || !activeDoc) return;

    const docKey = activeDoc.doc_key;
    const newDocs = {
      ...uploadedDocs,
      [docKey]: {
        uploaded: true,
        previewUrl: selectedImage.previewUrl,
        file: selectedImage.file,
        name: selectedImage.name || activeDoc.name,
      },
    };
    setUploadedDocs(newDocs);

    await broadcastUploadToLaptop(
      docKey,
      activeDoc.name,
      selectedImage.file,
      selectedImage.previewUrl
    );

    toast.success(`${activeDoc.name} uploaded successfully`);
    setCurrentView("document_list");
  };

  const handleRetryPhoto = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    setValidationResult(null);
    setCurrentView("photo_upload");
  };

  const handleCancelPhotoFlow = () => {
    if (selectedImage?.previewUrl && !uploadedDocs[activeDoc?.doc_key]?.uploaded) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    setValidationResult(null);
    setCurrentView("document_list");
  };

  // ==========================================
  // 2. PASSPORT BIO PAGE SCAN FLOW
  // ==========================================
  const handlePassportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const previewUrl = URL.createObjectURL(file);
    setSelectedDocFile({ file, previewUrl, name: file.name, isPdf: file.type === "application/pdf" });
    setCurrentView("passport_preview");
  };

  const handleAcceptPassport = async () => {
    if (!selectedDocFile || !activeDoc) return;

    const docKey = activeDoc.doc_key;
    const newDocs = {
      ...uploadedDocs,
      [docKey]: {
        uploaded: true,
        previewUrl: selectedDocFile.previewUrl,
        file: selectedDocFile.file,
        name: selectedDocFile.name || activeDoc.name,
      },
    };
    setUploadedDocs(newDocs);

    await broadcastUploadToLaptop(
      docKey,
      activeDoc.name,
      selectedDocFile.file,
      selectedDocFile.previewUrl
    );

    toast.success(`${activeDoc.name} uploaded successfully`);
    setCurrentView("document_list");
  };

  const handleRetryPassport = () => {
    if (selectedDocFile?.previewUrl) {
      URL.revokeObjectURL(selectedDocFile.previewUrl);
    }
    setSelectedDocFile(null);
    setCurrentView("passport_upload");
  };

  const handleCancelPassportFlow = () => {
    if (selectedDocFile?.previewUrl && !uploadedDocs[activeDoc?.doc_key]?.uploaded) {
      URL.revokeObjectURL(selectedDocFile.previewUrl);
    }
    setSelectedDocFile(null);
    setCurrentView("document_list");
  };

  // ==========================================
  // 3. GENERIC DOCUMENT FLOW (BANK STATEMENT, ETC.)
  // ==========================================
  const handleGenericFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const previewUrl = URL.createObjectURL(file);
    setSelectedDocFile({ file, previewUrl, name: file.name, isPdf: file.type === "application/pdf" });
    setCurrentView("generic_preview");
  };

  const handleAcceptGeneric = async () => {
    if (!selectedDocFile || !activeDoc) return;

    const docKey = activeDoc.doc_key;
    const newDocs = {
      ...uploadedDocs,
      [docKey]: {
        uploaded: true,
        previewUrl: selectedDocFile.previewUrl,
        file: selectedDocFile.file,
        name: selectedDocFile.name || activeDoc.name,
      },
    };
    setUploadedDocs(newDocs);

    await broadcastUploadToLaptop(
      docKey,
      activeDoc.name,
      selectedDocFile.file,
      selectedDocFile.previewUrl
    );

    toast.success(`${activeDoc.name} uploaded successfully`);
    setCurrentView("document_list");
  };

  const handleRetryGeneric = () => {
    if (selectedDocFile?.previewUrl) {
      URL.revokeObjectURL(selectedDocFile.previewUrl);
    }
    setSelectedDocFile(null);
    setCurrentView("generic_upload");
  };

  const handleCancelGenericFlow = () => {
    if (selectedDocFile?.previewUrl && !uploadedDocs[activeDoc?.doc_key]?.uploaded) {
      URL.revokeObjectURL(selectedDocFile.previewUrl);
    }
    setSelectedDocFile(null);
    setCurrentView("document_list");
  };

  // Loading indicator while schema is being loaded
  if (schemaLoading && !schema) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-teal animate-spin mb-3" />
        <p className="text-sm font-medium text-navy">Loading application documents…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-ink flex flex-col justify-between selection:bg-teal/20 selection:text-navy">
      {/* Hidden file inputs for Mobile Camera & Gallery - Photo */}
      <input
        ref={photoCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handlePhotoFileChange}
      />
      <input
        ref={photoGalleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoFileChange}
      />

      {/* Hidden file inputs for Mobile Camera & Gallery - Passport */}
      <input
        ref={passportCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePassportFileChange}
      />
      <input
        ref={passportGalleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePassportFileChange}
      />

      {/* Hidden file inputs for Mobile Camera & Gallery - Generic Document */}
      <input
        ref={genericCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleGenericFileChange}
      />
      <input
        ref={genericFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleGenericFileChange}
      />

      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col">
        {/* ========================================================= */}
        {/* VIEW 1: Main Document List Screen (Dynamic)               */}
        {/* ========================================================= */}
        {currentView === "document_list" && (
          <motion.div
            key="document_list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col px-5 py-6 sm:px-8"
          >
            {/* Top Brand Header */}
            <header className="flex items-center justify-between pb-6 border-b border-border/50">
              <AmaraVisaLogo size="sm" />
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-teal/10 text-teal border border-teal/20">
                <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                Live sync active
              </div>
            </header>

            {/* Title & Subtitle */}
            <div className="pt-6 pb-5">
              <h1 className="font-display text-2xl sm:text-3xl text-navy font-semibold tracking-tight">
                Upload your documents
              </h1>
              <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
                Scan or upload from this phone. Your application updates automatically.
              </p>
            </div>

            {/* Dynamic Progress Card */}
            <div className="p-4 rounded-2xl bg-white border border-border/70 shadow-xs mb-6">
              <div className="flex items-center justify-between text-sm mb-2.5">
                <span className="font-medium text-navy">
                  {uploadedRequiredCount} of {totalRequiredCount} uploaded
                </span>
                <span className="font-mono font-semibold text-teal text-xs tracking-wider">
                  {progressPct}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                <motion.div
                  className="h-full bg-teal rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Dynamic Document Tasks List */}
            <div className="space-y-3 flex-1">
              {documents.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-border/70 text-ink-muted text-sm">
                  No documents are required for this visa product.
                </div>
              ) : (
                documents.map((doc) => {
                  const IconComponent = getDocumentIcon(doc);
                  const isUploaded = Boolean(uploadedDocs[doc.doc_key]?.uploaded);

                  return (
                    <button
                      key={doc.doc_key}
                      type="button"
                      onClick={() => handleOpenDocTask(doc)}
                      data-testid={`mobile-doc-task-${doc.doc_key}`}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all shadow-xs flex items-center justify-between gap-4 group active:scale-[0.99] cursor-pointer",
                        isUploaded
                          ? "bg-teal/5 border-teal/30 hover:border-teal/50"
                          : "bg-white border-border/80 hover:border-navy hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            isUploaded
                              ? "bg-teal/20 text-teal"
                              : "bg-teal/10 text-teal group-hover:bg-teal/20"
                          )}
                        >
                          {isUploaded ? (
                            <CheckCircle2 className="w-5 h-5 text-teal" />
                          ) : (
                            <IconComponent className="w-5 h-5 text-teal" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm text-navy leading-snug truncate">
                              {doc.name}
                            </h3>
                            {!doc.required && (
                              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle bg-surface-muted px-1.5 py-0.5 rounded">
                                Optional
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {isUploaded ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-teal">
                                Uploaded <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="text-xs text-ink-subtle">Not uploaded</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isUploaded && (
                          <span className="text-[11px] font-mono uppercase tracking-wider text-teal font-medium bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20">
                            Done
                          </span>
                        )}
                        <ChevronRight
                          className={cn(
                            "w-5 h-5 transition-all",
                            isUploaded
                              ? "text-teal"
                              : "text-ink-muted group-hover:text-navy group-hover:translate-x-0.5"
                          )}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Actions & Security Notice */}
            <div className="pt-8 pb-4 space-y-3 mt-auto">
              <Button
                type="button"
                size="lg"
                disabled={uploadedRequiredCount === 0}
                className="w-full rounded-2xl h-12 text-sm font-medium shadow-sm transition-all cursor-pointer"
                onClick={async () => {
                  // Ensure all current uploads are flushed and synced to backend
                  const docsToSync = Object.entries(uploadedDocs).map(([k, u]) => ({
                    doc_key: k,
                    name: u.name || k,
                    file_url: u.previewUrl || "",
                    filename: u.file?.name || u.name || `${k}.jpg`,
                    storage_key: u.storage_key || null,
                    progress: progressPct,
                  }));
                  try {
                    await api.post(`/documents/session/${encodeURIComponent(effectiveSessionId)}/sync`, {
                      documents: docsToSync,
                    });
                  } catch {}
                  if (effectiveDraftId) {
                    try {
                      await api.patch(`/cases/drafts/${effectiveDraftId}?session_id=${encodeURIComponent(effectiveSessionId)}`, {
                        document_uploads: docsToSync,
                      });
                    } catch {}
                  }
                  toast.success(
                    "Documents synced! You can continue uploading or review your desktop screen."
                  );
                }}
              >
                Continue
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
                <Lock className="w-3.5 h-3.5 text-teal" />
                <span>Protected with 256-bit SSL encryption</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: Photo Splash Loader                               */}
        {/* ========================================================= */}
        {currentView === "photo_loading" && (
          <motion.div
            key="photo_loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center"
          >
            <div className="relative mb-6">
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="p-6 rounded-3xl bg-white border border-border/80 shadow-md flex items-center justify-center"
              >
                <AmaraVisaLogo size="lg" priority />
              </motion.div>
            </div>
            <div className="flex items-center gap-2 text-navy font-display text-lg font-semibold mb-1.5">
              <Loader2 className="w-4 h-4 text-teal animate-spin" />
              Preparing photo upload…
            </div>
            <p className="text-xs text-ink-muted max-w-xs leading-relaxed">
              Setting up secure camera and upload connection
            </p>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: Photo Upload Options Screen                       */}
        {/* ========================================================= */}
        {currentView === "photo_upload" && (
          <motion.div
            key="photo_upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col px-5 py-6 sm:px-8"
          >
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <button
                type="button"
                onClick={handleCancelPhotoFlow}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-navy transition-colors py-1 px-2 -ml-2 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to documents</span>
              </button>
              <AmaraVisaLogo size="sm" />
            </div>

            {/* Header */}
            <div className="pt-5 pb-4">
              <h2 className="font-display text-2xl text-navy font-semibold tracking-tight">
                {activeDoc?.name || "Passport-size photograph"}
              </h2>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                {activeDoc?.description || "Provide a recent color photograph showing your full front face clearly."}
              </p>
            </div>

            {/* Photo Guidelines Card */}
            <div className="p-4 rounded-2xl bg-white border border-border/70 shadow-xs mb-6 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy">
                <Sparkles className="w-3.5 h-3.5 text-teal" />
                Photo Guidelines
              </div>
              <ul className="text-xs text-ink-muted space-y-1.5 leading-relaxed list-disc list-inside">
                <li>Plain white or light-colored background</li>
                <li>Look directly at the camera with neutral expression</li>
                <li>Ensure good lighting without glare, shadows, or filters</li>
                <li>No sunglasses, hats, or headwear obscuring facial features</li>
              </ul>
            </div>

            {/* Action Buttons: Take Photo & Choose Photo */}
            <div className="space-y-3 mt-auto pb-4">
              <Button
                type="button"
                size="lg"
                onClick={() => photoCameraInputRef.current?.click()}
                data-testid="btn-take-photo"
                className="w-full h-14 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => photoGalleryInputRef.current?.click()}
                data-testid="btn-choose-photo"
                className="w-full h-14 rounded-2xl text-sm font-medium bg-white border-border-strong hover:bg-surface-muted text-navy flex items-center justify-center gap-2.5 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <ImageIcon className="w-5 h-5 text-teal" />
                <span>Choose Photo</span>
              </Button>

              <div className="text-center pt-2">
                <p className="text-[11px] text-ink-subtle">
                  Supported formats: JPG, PNG, WEBP · Max 5MB
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: Photo Preview & Validation Screen                 */}
        {/* ========================================================= */}
        {currentView === "photo_preview" && selectedImage && (
          <motion.div
            key="photo_preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col px-5 py-6 sm:px-8"
          >
            {/* Top Navigation */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <button
                type="button"
                onClick={handleRetryPhoto}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-navy transition-colors py-1 px-2 -ml-2 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <AmaraVisaLogo size="sm" />
            </div>

            {/* Photo Card Preview */}
            <div className="py-4 flex-1 flex flex-col items-center justify-center">
              <div className="relative w-56 sm:w-64 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-border/80 bg-black/5 shadow-md flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.previewUrl}
                  alt="Passport photo preview"
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 pointer-events-none border-2 border-white/40 rounded-2xl m-2" />

                <div className="absolute top-3 right-3">
                  {isValidating ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 text-white backdrop-blur-md">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking…
                    </span>
                  ) : validationResult?.detected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-600 text-white shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-600 text-white shadow-xs">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Issue
                    </span>
                  )}
                </div>
              </div>

              {/* Validation Result Box */}
              <div className="w-full max-w-sm mt-5">
                {isValidating ? (
                  <div className="p-3.5 rounded-xl bg-surface-muted border border-border flex items-center justify-center gap-2.5 text-xs text-ink-muted">
                    <Loader2 className="w-4 h-4 text-teal animate-spin" />
                    <span>Analyzing photo quality and face positioning…</span>
                  </div>
                ) : validationResult?.detected ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-left">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{validationResult.message || "Photo looks good"}</span>
                    </div>
                    <p className="text-xs text-emerald-800/80 mt-1 pl-6 leading-relaxed">
                      Face detected clearly. Ready to use for your visa application.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-left">
                    <div className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        {validationResult?.message ||
                          "We couldn't detect a face in this photo. Please upload a clear photo showing your face."}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/80 mt-1 pl-6 leading-relaxed">
                      Make sure your face is well-lit, looking straight ahead, with no heavy shadows or obstructions.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Decision Actions */}
            <div className="pt-2 pb-4 space-y-2.5">
              {validationResult?.detected ? (
                <>
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleAcceptPhoto}
                    data-testid="btn-accept-photo"
                    className="w-full h-12 rounded-2xl text-sm font-medium shadow-sm bg-navy hover:bg-navy-hover active:scale-[0.99] transition-transform cursor-pointer"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Use this photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetryPhoto}
                    className="w-full h-10 rounded-xl text-xs text-ink-muted hover:text-navy border-border cursor-pointer"
                  >
                    Retake or choose another
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleRetryPhoto}
                    data-testid="btn-retry-photo"
                    className="w-full h-12 rounded-2xl text-sm font-medium shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Try Again
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelPhotoFlow}
                    className="w-full h-10 rounded-xl text-xs text-ink-muted hover:text-navy cursor-pointer"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: Passport Splash Loader                            */}
        {/* ========================================================= */}
        {currentView === "passport_loading" && (
          <motion.div
            key="passport_loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center"
          >
            <div className="relative mb-6">
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="p-6 rounded-3xl bg-white border border-border/80 shadow-md flex items-center justify-center"
              >
                <AmaraVisaLogo size="lg" priority />
              </motion.div>
            </div>
            <div className="flex items-center gap-2 text-navy font-display text-lg font-semibold mb-1.5">
              <Loader2 className="w-4 h-4 text-teal animate-spin" />
              Preparing passport scan…
            </div>
            <p className="text-xs text-ink-muted max-w-xs leading-relaxed">
              Initializing document scanner and camera
            </p>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: Passport Upload Options Screen                    */}
        {/* ========================================================= */}
        {currentView === "passport_upload" && (
          <motion.div
            key="passport_upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col px-5 py-6 sm:px-8"
          >
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <button
                type="button"
                onClick={handleCancelPassportFlow}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-navy transition-colors py-1 px-2 -ml-2 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to documents</span>
              </button>
              <AmaraVisaLogo size="sm" />
            </div>

            {/* Header */}
            <div className="pt-5 pb-4">
              <h2 className="font-display text-2xl text-navy font-semibold tracking-tight">
                {activeDoc?.name || "Passport bio page scan"}
              </h2>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                {activeDoc?.description || "Capture or select a clear image of the front biographical page of your passport."}
              </p>
            </div>

            {/* Passport Guidelines Card */}
            <div className="p-4 rounded-2xl bg-white border border-border/70 shadow-xs mb-6 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy">
                <Sparkles className="w-3.5 h-3.5 text-teal" />
                Passport Scan Guidelines
              </div>
              <ul className="text-xs text-ink-muted space-y-1.5 leading-relaxed list-disc list-inside">
                <li>Show the complete bio page with all 4 corners visible</li>
                <li>Avoid flash reflection, glare, or heavy shadows over details</li>
                <li>Ensure the machine-readable zone (MRZ lines at bottom) is crisp</li>
                <li>Do not cover any text or photo with fingers or objects</li>
              </ul>
            </div>

            {/* Action Buttons: Take Photo & Choose Photo */}
            <div className="space-y-3 mt-auto pb-4">
              <Button
                type="button"
                size="lg"
                onClick={() => passportCameraInputRef.current?.click()}
                data-testid="btn-take-passport"
                className="w-full h-14 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => passportGalleryInputRef.current?.click()}
                data-testid="btn-choose-passport"
                className="w-full h-14 rounded-2xl text-sm font-medium bg-white border-border-strong hover:bg-surface-muted text-navy flex items-center justify-center gap-2.5 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <ImageIcon className="w-5 h-5 text-teal" />
                <span>Choose Photo</span>
              </Button>

              <div className="text-center pt-2">
                <p className="text-[11px] text-ink-subtle">
                  Supported formats: JPG, PNG, WEBP · Max 10MB
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 7: Passport Preview & Confirmation Screen            */}
        {/* ========================================================= */}
        {currentView === "passport_preview" && selectedDocFile && (
          <motion.div
            key="passport_preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col px-5 py-6 sm:px-8"
          >
            {/* Top Navigation */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <button
                type="button"
                onClick={handleRetryPassport}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-navy transition-colors py-1 px-2 -ml-2 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <AmaraVisaLogo size="sm" />
            </div>

            {/* Passport Preview Card */}
            <div className="py-4 flex-1 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-xs aspect-[4/3] rounded-2xl overflow-hidden border-2 border-border/80 bg-black/5 shadow-md flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedDocFile.previewUrl}
                  alt="Passport bio page preview"
                  className="w-full h-full object-contain bg-black/5"
                />

                <div className="absolute inset-2 pointer-events-none border border-dashed border-teal/50 rounded-xl" />

                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal text-white shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                    Ready
                  </span>
                </div>
              </div>

              {/* Status Note Box */}
              <div className="w-full max-w-sm mt-5">
                <div className="p-4 rounded-xl bg-teal/5 border border-teal/20 text-left">
                  <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <CheckCircle2 className="w-4 h-4 text-teal shrink-0" />
                    <span>{activeDoc?.name || "Passport scan"} ready to upload</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1 pl-6 leading-relaxed">
                    Check that all details and numbers are clearly legible before confirming.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Decision Actions */}
            <div className="pt-2 pb-4 space-y-2.5">
              <Button
                type="button"
                size="lg"
                onClick={handleAcceptPassport}
                data-testid="btn-accept-passport"
                className="w-full h-12 rounded-2xl text-sm font-medium shadow-sm bg-navy hover:bg-navy-hover active:scale-[0.99] transition-transform cursor-pointer"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Use this passport scan
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetryPassport}
                className="w-full h-10 rounded-xl text-xs text-ink-muted hover:text-navy border-border cursor-pointer"
              >
                Retake or choose another
              </Button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 8: Generic Document Splash Loader                    */}
        {/* ========================================================= */}
        {currentView === "generic_loading" && (
          <motion.div
            key="generic_loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center"
          >
            <div className="relative mb-6">
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="p-6 rounded-3xl bg-white border border-border/80 shadow-md flex items-center justify-center"
              >
                <AmaraVisaLogo size="lg" priority />
              </motion.div>
            </div>
            <div className="flex items-center gap-2 text-navy font-display text-lg font-semibold mb-1.5">
              <Loader2 className="w-4 h-4 text-teal animate-spin" />
              Preparing {activeDoc?.name || "document"}…
            </div>
            <p className="text-xs text-ink-muted max-w-xs leading-relaxed">
              Setting up secure camera and upload connection
            </p>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 9: Generic Document Upload Options Screen            */}
        {/* ========================================================= */}
        {currentView === "generic_upload" && activeDoc && (
          <motion.div
            key="generic_upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col px-5 py-6 sm:px-8"
          >
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <button
                type="button"
                onClick={handleCancelGenericFlow}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-navy transition-colors py-1 px-2 -ml-2 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to documents</span>
              </button>
              <AmaraVisaLogo size="sm" />
            </div>

            {/* Header */}
            <div className="pt-5 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl text-navy font-semibold tracking-tight">
                  {activeDoc.name}
                </h2>
                {!activeDoc.required && (
                  <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle bg-surface-muted px-2 py-0.5 rounded">
                    Optional
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                {activeDoc.description || "Upload a clear photo or document scan from your phone."}
              </p>
            </div>

            {/* Document Guidelines Card */}
            <div className="p-4 rounded-2xl bg-white border border-border/70 shadow-xs mb-6 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy">
                <Sparkles className="w-3.5 h-3.5 text-teal" />
                Document Requirements
              </div>
              <ul className="text-xs text-ink-muted space-y-1.5 leading-relaxed list-disc list-inside">
                <li>Make sure all text, dates, and amounts are clearly readable</li>
                <li>Avoid blurry images or glare from light sources</li>
                <li>Keep the full document within the frame with no corners cut off</li>
                <li>
                  Allowed formats:{" "}
                  <span className="font-mono text-navy font-medium">
                    {(activeDoc.formats || ["JPG", "PNG", "PDF"]).join(", ").toUpperCase()}
                  </span>{" "}
                  · Max {activeDoc.max_size_mb || 10}MB
                </li>
              </ul>
            </div>

            {/* Action Buttons: Take Photo & Choose File */}
            <div className="space-y-3 mt-auto pb-4">
              <Button
                type="button"
                size="lg"
                onClick={() => genericCameraInputRef.current?.click()}
                data-testid="btn-take-generic"
                className="w-full h-14 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => genericFileInputRef.current?.click()}
                data-testid="btn-choose-generic"
                className="w-full h-14 rounded-2xl text-sm font-medium bg-white border-border-strong hover:bg-surface-muted text-navy flex items-center justify-center gap-2.5 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <File className="w-5 h-5 text-teal" />
                <span>Choose File / Photo</span>
              </Button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 10: Generic Document Preview & Confirmation          */}
        {/* ========================================================= */}
        {currentView === "generic_preview" && selectedDocFile && activeDoc && (
          <motion.div
            key="generic_preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col px-5 py-6 sm:px-8"
          >
            {/* Top Navigation */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <button
                type="button"
                onClick={handleRetryGeneric}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-navy transition-colors py-1 px-2 -ml-2 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <AmaraVisaLogo size="sm" />
            </div>

            {/* Document Preview Card */}
            <div className="py-4 flex-1 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-xs aspect-[4/3] rounded-2xl overflow-hidden border-2 border-border/80 bg-black/5 shadow-md flex items-center justify-center">
                {selectedDocFile.isPdf ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <FileText className="w-12 h-12 text-teal mb-2" />
                    <span className="text-xs font-medium text-navy max-w-[200px] truncate">
                      {selectedDocFile.name}
                    </span>
                    <span className="text-[10px] font-mono text-ink-subtle mt-1">PDF Document</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedDocFile.previewUrl}
                    alt={`${activeDoc.name} preview`}
                    className="w-full h-full object-contain bg-black/5"
                  />
                )}

                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal text-white shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                    Ready
                  </span>
                </div>
              </div>

              {/* Status Note Box */}
              <div className="w-full max-w-sm mt-5">
                <div className="p-4 rounded-xl bg-teal/5 border border-teal/20 text-left">
                  <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <CheckCircle2 className="w-4 h-4 text-teal shrink-0" />
                    <span>{activeDoc.name} ready</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1 pl-6 leading-relaxed">
                    Review your document before confirming. Your desktop application will update automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Decision Actions */}
            <div className="pt-2 pb-4 space-y-2.5">
              <Button
                type="button"
                size="lg"
                onClick={handleAcceptGeneric}
                data-testid="btn-accept-generic"
                className="w-full h-12 rounded-2xl text-sm font-medium shadow-sm bg-navy hover:bg-navy-hover active:scale-[0.99] transition-transform cursor-pointer"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Use this document
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetryGeneric}
                className="w-full h-10 rounded-xl text-xs text-ink-muted hover:text-navy border-border cursor-pointer"
              >
                Retake or choose another
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
