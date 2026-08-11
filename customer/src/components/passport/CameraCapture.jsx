"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Camera capture via getUserMedia — rear camera preferred.
 * Stops tracks on unmount / close.
 */
export default function CameraCapture({ onCapture, onCancel, disabled }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [capturing, setCapturing] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError("Camera is not supported in this browser. Please upload an image instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (e) {
        const name = e?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera permission denied. Allow camera access or upload a file.");
        } else if (name === "NotFoundError") {
          setError("No camera found. Please upload a passport image or PDF.");
        } else {
          setError("Could not open the camera. Please upload a file instead.");
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const capture = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) {
        toast.error("Could not capture frame.");
        return;
      }
      const file = new File([blob], `passport-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      stop();
      onCapture?.(file);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-3 space-y-3" data-testid="camera-capture">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-navy">Position the passport inside the frame</p>
          <ul className="mt-1 text-xs text-ink-muted space-y-0.5 list-disc list-inside">
            <li>Keep all four corners visible</li>
            <li>Avoid glare and use good lighting</li>
            <li>Hold the phone steady</li>
          </ul>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-muted text-ink-muted"
          onClick={() => {
            stop();
            onCancel?.();
          }}
          aria-label="Close camera"
          data-testid="camera-cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">{error}</p>
      ) : (
        <div className="relative aspect-[3/2] bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" aria-label="Camera preview" />
          <div className="pointer-events-none absolute inset-6 border-2 border-white/70 rounded-md" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Starting camera…
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={capture}
          disabled={!ready || disabled || capturing || !!error}
          data-testid="camera-shutter"
        >
          {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Capture
        </Button>
        <Button type="button" variant="secondary" onClick={() => { stop(); onCancel?.(); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function FileDropZone({ onFile, disabled, accept = "image/jpeg,image/png,image/webp,application/pdf,.pdf" }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    const okType =
      /^image\/(jpeg|png|webp)$/i.test(file.type) ||
      file.type === "application/pdf" ||
      /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    if (!okType) {
      toast.error("Please upload a JPG, PNG, WebP, or PDF passport scan.");
      return;
    }
    onFile?.(file);
  };

  return (
    <div
      className={cn(
        "border border-dashed rounded-xl p-4 text-center transition-colors",
        dragOver ? "border-navy bg-navy/5" : "border-border bg-surface",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      data-testid="passport-dropzone"
    >
      <Upload className="w-5 h-5 mx-auto text-ink-muted mb-2" />
      <p className="text-sm text-ink">Drag passport image/PDF here</p>
      <p className="text-xs text-ink-muted mb-3">JPG, JPEG, PNG, WebP, PDF</p>
      <label className="inline-flex">
        <span className="text-sm bg-navy text-white rounded-full px-4 py-2 cursor-pointer hover:bg-navy/90">
          Choose file
        </span>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          disabled={disabled}
          data-testid="scan-passport-input"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
