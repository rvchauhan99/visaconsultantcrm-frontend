import React, { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import api, { resolveFileUrl } from "@/lib/api";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { cn } from "@/lib/utils";

/**
 * Banner URL + file upload with live 3:4 card preview (homepage destination cards).
 * File uploads go to POST /media/product-banner (public R2/local WebP).
 * External URLs are stored as-is.
 */
export function BannerImageField({
  value = "",
  onChange,
  label = "Banner image",
  className,
  inputClassName,
  testIdPrefix = "banner",
  compact = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const clearLocalPreview = () => {
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleUrlChange = (e) => {
    clearLocalPreview();
    onChange(e.target.value);
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/media/product-banner", fd);
      const url = r.data.url || r.data.file_url;
      onChange(url);
      toast.success("Banner uploaded — save to apply");
      clearLocalPreview();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const previewSrc = localPreview || (value ? resolveFileUrl(value) : null);

  return (
    <CrmField label={label} className={className}>
      <div className="flex items-center gap-1.5">
        <CrmInput
          className={cn("flex-1", inputClassName)}
          value={value}
          onChange={handleUrlChange}
          placeholder="https://… or upload"
          data-testid={`${testIdPrefix}-url`}
        />
        <label
          className="shrink-0 h-9 w-9 flex items-center justify-center border border-border rounded-lg cursor-pointer hover:bg-surface text-ink-muted"
          title="Upload banner image"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={upload}
            data-testid={`${testIdPrefix}-upload`}
          />
        </label>
      </div>

      <div
        className="mt-2 rounded-lg border border-border bg-surface px-3 py-2.5 space-y-1.5"
        data-testid={`${testIdPrefix}-tips`}
      >
        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Homepage card fit</div>
        <ul className="text-[11px] text-ink-muted space-y-0.5 list-disc pl-3.5 leading-snug">
          <li>
            Aspect <span className="font-semibold text-ink">3:4 portrait</span> (same as website destination cards)
          </li>
          <li>
            Recommended <span className="font-semibold text-ink">900×1200 px</span>
            <span className="text-ink-muted"> (min ~600×800)</span>
          </li>
          <li>Formats: JPG / PNG / WebP · max 15 MB</li>
        </ul>
        <ul className="text-[11px] text-ink-muted space-y-0.5 list-disc pl-3.5 leading-snug border-t border-border pt-1.5">
          <li>
            Keep the subject <span className="font-semibold text-ink">centered</span> — edges may be cropped if not 3:4
          </li>
          <li>Avoid wide landscape photos — left/right edges will be cut off</li>
        </ul>
      </div>

      {previewSrc && (
        <div
          className={cn(
            "mt-2 overflow-hidden rounded-lg border border-border bg-surface",
            compact ? "w-20" : "w-28",
          )}
          style={{ aspectRatio: "3 / 4" }}
        >
          <img
            src={previewSrc}
            alt="Banner preview"
            className="h-full w-full object-cover"
            data-testid={`${testIdPrefix}-preview`}
            onError={(e) => {
              e.currentTarget.style.opacity = "0.35";
            }}
          />
        </div>
      )}
    </CrmField>
  );
}

export default BannerImageField;
