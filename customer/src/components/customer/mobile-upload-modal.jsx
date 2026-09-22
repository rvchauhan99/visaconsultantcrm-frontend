"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  X,
  FileCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

/**
 * MobileUploadModal provides the 2-step "Upload from Mobile" flow:
 * Step 1 (Instructions): 3-step visual guide + "Continue on phone" CTA.
 * Step 2 (QR Code): Scannable QR code + "Secure & private" guarantee + Back/Close controls.
 */
export function MobileUploadModal({
  open,
  onOpenChange,
  productId,
  draftId,
  sessionId,
  uploadedDocs = {},
  totalCount,
}) {
  const [currentStep, setCurrentStep] = useState("instructions"); // "instructions" | "qr"
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(true);

  // QR must open on a phone-reachable host (never baked-in LAN IPs).
  // Prefer SITE_URL / APP_URL, then current origin when not localhost.
  // For local dual-device QA set NEXT_PUBLIC_SITE_URL=http://<your-lan-ip>:3000
  const getMobileBaseUrl = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
    const envUrl = siteUrl || appUrl;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        return origin;
      }
      return origin;
    }
    return envUrl || "http://localhost:3000";
  };

  const effectiveSessionId = sessionId || draftId || "mus_default";
  const mobileConnectUrl = `${getMobileBaseUrl()}/apply/${productId || ""}?mobile_connect=1&session_id=${effectiveSessionId}${draftId ? `&draft=${draftId}` : ""}`;

  // Prime backend session cache with already uploaded laptop documents when modal opens
  useEffect(() => {
    if (!open || !effectiveSessionId) return;

    const entries = Object.entries(uploadedDocs || {}).filter(
      ([, u]) => u && (u.file_url || u.filename)
    );
    if (entries.length === 0) return;

    const docsToSync = entries.map(([doc_key, u]) => ({
      doc_key,
      name: u.filename || doc_key,
      file_url: u.file_url || "",
      filename: u.filename || `${doc_key}.jpg`,
      storage_key: u.storage_key || null,
    }));

    api
      .post(`/documents/session/${encodeURIComponent(effectiveSessionId)}/sync`, {
        documents: docsToSync,
      })
      .catch(() => {
        // Fallback: send individual notify-upload events
        docsToSync.forEach((d) => {
          api
            .post("/documents/notify-upload", {
              session_id: effectiveSessionId,
              doc_key: d.doc_key,
              document_type: d.doc_key,
              name: d.name,
              status: "uploaded",
              file_url: d.file_url,
              filename: d.filename,
            })
            .catch(() => {});
        });
      });
  }, [open, effectiveSessionId, uploadedDocs]);

  // Generate the QR code as a high-resolution data URL
  useEffect(() => {
    if (!open) {
      // Reset to instruction screen when closed
      setCurrentStep("instructions");
      return;
    }

    setQrLoading(true);
    QRCode.toDataURL(mobileConnectUrl, {
      width: 480,
      margin: 1.5,
      errorCorrectionLevel: "M",
      color: {
        dark: "#143026", // Deep brand navy
        light: "#ffffff",
      },
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err);
      })
      .finally(() => {
        setQrLoading(false);
      });
  }, [open, mobileConnectUrl]);

  const handleClose = () => {
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className={cn(
          "w-[calc(100vw-2rem)] max-w-2xl p-0 overflow-hidden",
          "rounded-3xl border border-border/80 bg-surface shadow-2xl",
          "transition-all duration-300",
        )}
      >
        {/* Accessible Dialog Title & Description for Screen Readers */}
        <DialogTitle asChild>
          <VisuallyHidden>
            {currentStep === "instructions"
              ? "Upload documents using your phone"
              : "Scan with your phone camera"}
          </VisuallyHidden>
        </DialogTitle>
        <DialogDescription asChild>
          <VisuallyHidden>
            {currentStep === "instructions"
              ? "Scan, connect, and securely upload your documents in real time"
              : "Open your smartphone camera or QR scanner and point it at the code below"}
          </VisuallyHidden>
        </DialogDescription>

        {currentStep === "instructions" ? (
          <InstructionView
            onContinue={() => setCurrentStep("qr")}
            onClose={handleClose}
          />
        ) : (
          <QrCodeView
            qrDataUrl={qrDataUrl}
            qrLoading={qrLoading}
            uploadedDocs={uploadedDocs}
            totalCount={totalCount}
            onBack={() => setCurrentStep("instructions")}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Step 1: Instruction Screen
 */
function InstructionView({ onContinue, onClose }) {
  return (
    <div className="flex flex-col">
      {/* Modal Top Header with Close Button */}
      <div className="relative px-6 pt-6 pb-2 sm:px-8 sm:pt-8 flex items-start justify-between">
        <div className="flex-1 pr-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium tracking-wide uppercase bg-teal/10 text-teal border border-teal/20 mb-3">
            <Smartphone className="w-3.5 h-3.5" />
            Mobile Connect
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-navy font-semibold tracking-tight leading-snug">
            Upload documents using your phone
          </h2>
          <p className="text-sm text-ink-muted mt-1.5 leading-relaxed max-w-lg">
            Scan, connect, and securely upload your documents in real time
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 3-Step Visual Instruction Grid */}
      <div className="px-6 py-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Step 1 */}
          <div className="group relative rounded-2xl border border-border/70 bg-surface-card p-4 flex flex-col items-center text-center shadow-xs transition-all hover:border-teal/50 hover:shadow-card">
            <div className="w-full flex items-center justify-between mb-2.5">
              <span className="w-6 h-6 rounded-full bg-navy/5 text-navy font-mono text-xs font-bold flex items-center justify-center border border-navy/10">
                1
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
                Step 01
              </span>
            </div>

            {/* Visual Illustration 1: QR Scan */}
            <div className="w-full h-28 rounded-xl bg-gradient-to-b from-surface-warm to-surface-muted border border-border/50 flex items-center justify-center relative overflow-hidden mb-3.5">
              <div className="relative flex items-center justify-center">
                {/* Phone mockup outline */}
                <div className="w-16 h-22 rounded-xl border-2 border-navy/60 bg-white/90 shadow-sm flex flex-col items-center justify-center p-1.5 relative">
                  <div className="w-4 h-0.5 bg-navy/30 rounded-full mb-1" />
                  {/* Viewfinder reticle */}
                  <div className="relative w-10 h-10 rounded-md border border-dashed border-teal flex items-center justify-center bg-teal/5">
                    <ScanLine className="w-6 h-6 text-teal animate-pulse" />
                    <QrCode className="w-4 h-4 text-navy/70 absolute opacity-70" />
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full border border-navy/30 mt-1" />
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-[13px] font-medium text-navy leading-snug">
              Scan the QR code to securely connect your phone
            </p>
          </div>

          {/* Step 2 */}
          <div className="group relative rounded-2xl border border-border/70 bg-surface-card p-4 flex flex-col items-center text-center shadow-xs transition-all hover:border-teal/50 hover:shadow-card">
            <div className="w-full flex items-center justify-between mb-2.5">
              <span className="w-6 h-6 rounded-full bg-navy/5 text-navy font-mono text-xs font-bold flex items-center justify-center border border-navy/10">
                2
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
                Step 02
              </span>
            </div>

            {/* Visual Illustration 2: Upload Device */}
            <div className="w-full h-28 rounded-xl bg-gradient-to-b from-surface-warm to-surface-muted border border-border/50 flex items-center justify-center relative overflow-hidden mb-3.5">
              <div className="relative flex items-center justify-center">
                {/* Phone mockup showing upload card */}
                <div className="w-16 h-22 rounded-xl border-2 border-navy/60 bg-white/90 shadow-sm flex flex-col items-center justify-between p-1.5">
                  <div className="w-4 h-0.5 bg-navy/30 rounded-full" />
                  <div className="w-11 h-10 rounded-lg bg-teal/10 border border-teal/30 flex flex-col items-center justify-center gap-0.5">
                    <UploadCloud className="w-4 h-4 text-teal" />
                    <span className="text-[7px] font-mono font-bold text-teal tracking-tighter uppercase">Upload</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full border border-navy/30" />
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-[13px] font-medium text-navy leading-snug">
              Your phone can now be used as an additional upload device
            </p>
          </div>

          {/* Step 3 */}
          <div className="group relative rounded-2xl border border-border/70 bg-surface-card p-4 flex flex-col items-center text-center shadow-xs transition-all hover:border-teal/50 hover:shadow-card">
            <div className="w-full flex items-center justify-between mb-2.5">
              <span className="w-6 h-6 rounded-full bg-navy/5 text-navy font-mono text-xs font-bold flex items-center justify-center border border-navy/10">
                3
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
                Step 03
              </span>
            </div>

            {/* Visual Illustration 3: Live Sync */}
            <div className="w-full h-28 rounded-xl bg-gradient-to-b from-surface-warm to-surface-muted border border-border/50 flex items-center justify-center relative overflow-hidden mb-3.5">
              <div className="flex items-center gap-2">
                {/* Smartphone */}
                <div className="w-10 h-16 rounded-lg border border-navy/50 bg-white flex flex-col items-center justify-center p-1 shadow-xs">
                  <FileCheck className="w-4 h-4 text-teal" />
                </div>
                {/* Sync badge */}
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-teal text-white flex items-center justify-center shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-[spin_4s_linear_infinite]" />
                  </div>
                </div>
                {/* Cloud / Vault */}
                <div className="w-12 h-14 rounded-lg border border-navy/50 bg-white flex flex-col items-center justify-center p-1 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-[13px] font-medium text-navy leading-snug">
              Your uploaded documents get synced in real-time
            </p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8 flex flex-col items-center">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onContinue}
          className="w-full sm:w-auto min-w-[240px] rounded-full px-8 py-3.5 text-base font-medium shadow-md hover:shadow-lg cursor-pointer transition-all"
        >
          Continue on phone →
        </Button>

        {/* Security Assurance Footnote */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <Lock className="w-3.5 h-3.5 text-teal shrink-0" />
          <span>Protected with industry-standard AES-256 encryption</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 2: QR Code Screen
 */
function QrCodeView({ qrDataUrl, qrLoading, uploadedDocs = {}, totalCount, onBack, onClose }) {
  const uploadedCount = Object.values(uploadedDocs).filter(
    (u) => u && (u.file_url || u.filename)
  ).length;
  const hasUploadedFromMobile = uploadedCount > 0;
  const displayTotal = totalCount || 3;

  return (
    <div className="flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Top Nav: Back and Close buttons */}
      <div className="px-5 pt-4 pb-1 sm:px-7 sm:pt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ink-muted hover:text-navy transition-colors rounded-full px-2.5 py-1 -ml-2 hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-navy cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy cursor-pointer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Heading & Subtitle */}
      <div className="px-5 pt-0.5 pb-1 sm:px-7 text-center">
        <h2 className="font-display text-xl sm:text-2xl text-navy font-semibold tracking-tight">
          Scan with your phone camera
        </h2>
        <p className="text-xs text-ink-muted mt-0.5 max-w-xs mx-auto leading-normal">
          Open your smartphone camera or QR scanner and point it at the code below
        </p>
      </div>

      {/* Center QR Code Card */}
      <div className="px-5 py-1.5 sm:px-7 flex flex-col items-center">
        <div className="relative p-3.5 sm:p-4 bg-white rounded-2xl border border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col items-center">
          {/* Decorative Corner Viewfinder Markers */}
          <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-teal rounded-tl-sm" />
          <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-teal rounded-tr-sm" />
          <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-teal rounded-bl-sm" />
          <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-teal rounded-br-sm" />

          {qrLoading ? (
            <div className="w-40 h-40 sm:w-44 sm:h-44 flex flex-col items-center justify-center gap-2 text-ink-muted">
              <RefreshCw className="w-6 h-6 animate-spin text-teal" />
              <span className="text-[11px] font-mono">Generating QR Code…</span>
            </div>
          ) : qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Scan QR Code to upload documents from phone"
              className="w-40 h-40 sm:w-44 sm:h-44 object-contain select-none"
            />
          ) : (
            <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center text-xs text-danger text-center p-3">
              Failed to load QR code. Please try again.
            </div>
          )}

          {/* Live sync status badge */}
          {hasUploadedFromMobile ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal/10 text-teal text-[11px] font-mono border border-teal/20 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
              <span>{uploadedCount} of {displayTotal} uploaded</span>
            </div>
          ) : (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-muted text-ink-muted text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>Ready to connect</span>
            </div>
          )}
        </div>
      </div>

      {/* Security Information Section - Fully Visible */}
      <div className="px-5 pt-2 pb-5 sm:px-7 sm:pb-6">
        <div className="max-w-sm mx-auto rounded-xl border border-teal/20 bg-teal/5 p-3 flex items-center gap-3 text-left shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-teal/15 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-teal" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-[13px] font-semibold text-navy leading-snug">Secure &amp; private</h4>
            <p className="text-[11px] text-ink-muted mt-0.5 leading-tight">
              Your connection is encrypted and your documents are always protected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileUploadModal;
