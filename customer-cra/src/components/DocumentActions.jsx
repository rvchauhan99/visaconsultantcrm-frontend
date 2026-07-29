import React from "react";
import { viewUrl, downloadUrl } from "../lib/api";

/**
 * Compact View + Download action group for private documents.
 *
 * Props:
 *   fileUrl      — /api/documents/download?token=... URL (required)
 *   filename     — original filename (optional)
 *   testIdPrefix — prefix for data-testid (default "doc")
 *   showDownload — show Download button (default true)
 *   className    — extra wrapper classes
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
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
        </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </a>
        </>
      )}
    </span>
  );
}
