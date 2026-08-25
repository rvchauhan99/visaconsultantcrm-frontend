"use client";

import { useState } from "react";
import { Camera, Loader2, ScanLine, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CameraCapture, { FileDropZone } from "@/components/passport/CameraCapture";
import ScanProgress from "@/components/passport/ScanProgress";
import { usePassportOCR } from "@/hooks/usePassportOCR";
import { mapOcrToTraveler } from "@/config/passportFieldMap";

/**
 * Scan passport — camera or file/PDF upload → OCR → parent autofill.
 * Never auto-submits the application.
 */
export default function PassportScanner({ traveler, setTraveler, onStatuses, onManual }) {
  const { scan, loading, reset } = usePassportOCR();
  const [mode, setMode] = useState("idle"); // idle | camera | upload
  const [confirmReplace, setConfirmReplace] = useState(null);

  const hasExisting =
    !!(traveler?.full_name || traveler?.passport_number || traveler?.dob || traveler?.passport_expiry_date);

  const runScan = async (file) => {
    if (!file) return;
    if (hasExisting && !confirmReplace) {
      setConfirmReplace(file);
      return;
    }
    setConfirmReplace(null);
    setMode("idle");
    try {
      const data = await scan(file);
      if (!data) return;
      setTraveler((prev) => mapOcrToTraveler(data, prev));
      onStatuses?.(data);
      const filled = ["full_name", "passport_number", "date_of_birth", "passport_expiry_date"].filter((k) => data[k]).length;
      toast.success(`Passport information detected — ${filled} field(s). Please review before continuing.`);
    } catch (err) {
      toast.error(err.message || "Couldn't read this passport.");
      setMode("idle");
    }
  };

  return (
    <div className="mb-4 space-y-3" data-testid="passport-scanner">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-full"
          onClick={() => setMode((m) => (m === "camera" ? "idle" : "camera"))}
          disabled={loading}
          data-testid="scan-passport-camera-btn"
        >
          <Camera className="w-4 h-4" />
          Scan passport
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="rounded-full"
          onClick={() => setMode((m) => (m === "upload" ? "idle" : "upload"))}
          disabled={loading}
          data-testid="scan-passport-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload passport
        </Button>
        <button
          type="button"
          className="text-xs text-ink-muted self-center underline-offset-2 hover:underline"
          onClick={() => {
            reset();
            onManual?.();
          }}
          data-testid="passport-enter-manually"
        >
          Enter manually
        </button>
      </div>

      <ScanProgress active={loading} />

      {confirmReplace && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm" data-testid="ocr-replace-confirm">
          <p className="text-ink mb-2">Replace existing passport details?</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => runScan(confirmReplace)}>
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setConfirmReplace(null)}
            >
              Keep current
            </Button>
          </div>
        </div>
      )}

      {mode === "camera" && !loading && (
        <CameraCapture onCapture={runScan} onCancel={() => setMode("idle")} disabled={loading} />
      )}
      {mode === "upload" && !loading && <FileDropZone onFile={runScan} disabled={loading} />}

      {mode === "idle" && !loading && (
        <div className="bg-surface-muted/50 rounded-lg p-3 border border-border flex items-start gap-2.5 mt-2 mb-1">
          <ScanLine className="w-4 h-4 text-teal shrink-0 mt-0.5" />
          <div className="text-xs text-ink-muted leading-relaxed">
            <span className="font-semibold text-ink block mb-0.5">Autofill with your passport (Optional)</span>
            Scan or upload your Indian passport's bio-data page to automatically fill in your details and save time.
          </div>
        </div>
      )}
    </div>
  );
}
