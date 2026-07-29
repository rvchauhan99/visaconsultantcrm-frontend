"use client";

import { Eye, Download } from "lucide-react";
import { viewUrl, downloadUrl } from "@/lib/api";

/**
 * Compact View + Download action group for private documents.
 *
 * Props:
 *   fileUrl     — /api/documents/download?token=... URL (required)
 *   filename    — original filename (optional; improves download name)
 *   testIdPrefix — prefix for data-testid (default "doc")
 *   showDownload — show Download button (default true)
 *   className   — extra wrapper classes
 */
export default function DocumentActions({
  fileUrl,
  filename,
  testIdPrefix = "doc",
  showDownload = true,
  className = "",
}) {
  if (!fileUrl) return null;

  const view = viewUrl(fileUrl);
  const dl = showDownload ? downloadUrl(fileUrl, filename) : null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a
        href={view}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-teal hover:underline"
        data-testid={`${testIdPrefix}-view`}
        title={`View ${filename || "document"}`}
      >
        <Eye className="w-3 h-3 shrink-0" />
        View
      </a>
      {dl && (
        <>
          <span className="text-border select-none">·</span>
          <a
            href={dl}
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-ink-muted hover:text-ink"
            data-testid={`${testIdPrefix}-download`}
            title={`Download ${filename || "document"}`}
          >
            <Download className="w-3 h-3 shrink-0" />
            Download
          </a>
        </>
      )}
    </span>
  );
}
