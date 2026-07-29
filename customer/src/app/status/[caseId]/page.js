"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Receipt, RefreshCw, Upload, XCircle } from "lucide-react";
import RequireCustomer from "@/components/auth/require-customer";
import SupportCard from "@/components/customer/support-card";
import Stamp from "@/components/ui/stamp";
import { Card, ErrorState, Skeleton } from "@/components/ui/card";
import { useCaseStatus } from "@/hooks/customer-api";
import api, { openReceipt } from "@/lib/api";
import { formatCaseNumber, formatInDate } from "@/lib/utils";
import { track } from "@/lib/telemetry";

/** Displayed timeline excludes draft `new`; map stage index correctly. */
const DISPLAY_STAGES = ["docs_pending", "ready_to_submit", "submitted", "decision", "closed"];

function timelineState(stage, displayIdx) {
  if (stage === "closed") return "past";
  if (stage === "new") return displayIdx === 0 ? "current" : "future";
  const mappedCurrent = DISPLAY_STAGES.indexOf(stage);
  if (mappedCurrent < 0) return "future";
  if (displayIdx < mappedCurrent) return "past";
  if (displayIdx === mappedCurrent) return "current";
  return "future";
}

export default function StatusPage() {
  return (
    <RequireCustomer>
      <StatusTracker />
    </RequireCustomer>
  );
}

function StatusTracker() {
  const { caseId } = useParams();
  const { data, isLoading, isError, refetch } = useCaseStatus(caseId, { poll: true });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-10 space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16">
        <ErrorState title="Couldn't load case status" onRetry={() => refetch()} />
      </div>
    );
  }

  const c = data.case;
  const snapshot = c.config_snapshot_json;
  const rejected = (data.documents || []).filter((d) => d.status === "rejected");

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-8">
      <Link href="/account" className="text-sm text-ink-muted hover:text-ink inline-block" data-testid="status-back">
        ← My applications
      </Link>

      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{snapshot.country_flag}</span>
            <h1 className="font-display text-3xl text-navy leading-tight">{snapshot.title}</h1>
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-ink-muted">
            Case {formatCaseNumber(c)} · Applied {formatInDate(c.created_at, { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Guaranteed by</div>
          <div className="font-display text-2xl text-navy">{c.sla_due_date ? formatInDate(c.sla_due_date) : "—"}</div>
          <SlaBadge status={data.sla_status} />
        </div>
      </div>

      {data.on_hold && (
        <div className="bg-warning/10 border-l-4 border-warning rounded-xl p-5 flex items-start gap-3" data-testid="on-hold-banner">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-warning">Additional information needed</div>
            <div className="text-sm text-ink-muted mt-0.5 mb-3">Your consultant has put this case on hold. Check rejected documents below or contact support.</div>
            <SupportCard source="on_hold" caseId={c.id} caseNumber={c.case_number} compact />
          </div>
        </div>
      )}

      <Card className="p-6 md:p-8">
        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-6">Your journey</div>
        <ol className="space-y-6">
          {DISPLAY_STAGES.map((s, i) => {
            const label = data.customer_facing_stage_flow?.find((x) => x.stage === s)?.label || s;
            const state = timelineState(c.stage, i);
            return (
              <li key={s} className="flex gap-4" data-testid={`timeline-${s}`}>
                <div className="shrink-0">
                  {state === "past" ? (
                    <Stamp tone="gold" size="lg" fill="filled" className="!p-0 w-14 h-14 !rounded-full motion-safe:animate-stamp-in">
                      ✓
                    </Stamp>
                  ) : state === "current" ? (
                    <Stamp tone="ink" size="lg" className="!text-navy !border-navy w-14 h-14 !p-0 !rounded-full motion-safe:animate-stamp-in">
                      {i + 1}
                    </Stamp>
                  ) : (
                    <span className="w-14 h-14 rounded-full border-2 border-dashed border-border text-ink-muted flex items-center justify-center font-mono">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 pt-2">
                  <div className={`text-base font-medium ${state === "future" ? "text-ink-muted" : "text-ink"}`}>{label}</div>
                  {state === "current" && (
                    <div className="text-sm text-ink-muted mt-1">{c.stage === "new" ? "We received your application." : "This is where you are now."}</div>
                  )}
                  {c.stage === "closed" && i === DISPLAY_STAGES.length - 1 && <div className="text-sm text-teal mt-1">Case completed.</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {rejected.length > 0 && (
        <div className="bg-white border-l-4 border-danger rounded-xl p-6" data-testid="rejected-panel">
          <h3 className="font-medium text-danger mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5" /> Action needed
          </h3>
          {rejected.map((d) => (
            <ResubmitDoc
              key={d.id}
              doc={d}
              caseId={caseId}
              snapshot={snapshot}
              onDone={() => {
                track("doc_resubmit_success", { case_id: caseId });
                refetch();
              }}
            />
          ))}
        </div>
      )}

      <Card className="p-6 md:p-8">
        <h3 className="font-display text-lg text-navy mb-4">Your documents</h3>
        <ul className="space-y-2">
          {(data.documents || []).map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`status-doc-${d.doc_key}`}>
              <span className="text-sm">{d.doc_name}</span>
              <DocStatusStamp status={d.status} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6 md:p-8">
        <h3 className="font-display text-lg text-navy mb-4">Payment</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-display text-ink">₹{(c.total_amount || 0).toLocaleString("en-IN")}</div>
            <div className="text-xs font-mono uppercase text-ink-muted">
              {c.payment_method} · {c.payment_reference}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Stamp tone={c.payment_status === "paid" ? "success" : "warning"} size="sm">
              {c.payment_status}
            </Stamp>
            {c.payment_status === "paid" && (
              <button
                onClick={() => openReceipt(c.id).catch(() => toast.error("Couldn't open receipt"))}
                data-testid="download-receipt"
                className="inline-flex items-center gap-1.5 text-xs text-teal hover:underline"
              >
                <Receipt className="w-3.5 h-3.5" /> Download receipt
              </button>
            )}
          </div>
        </div>
      </Card>

      {!data.on_hold && <SupportCard source="status" caseId={c.id} caseNumber={c.case_number} />}
    </div>
  );
}

function DocStatusStamp({ status }) {
  const tone = { requested: "muted", received: "teal", verified: "success", rejected: "danger" }[status] || "muted";
  return (
    <Stamp tone={tone} size="sm">
      {status}
    </Stamp>
  );
}

function SlaBadge({ status }) {
  const tone = { on_track: "success", due_soon: "warning", overdue: "danger", completed: "gold" }[status] || "muted";
  const label = { on_track: "On track", due_soon: "Due soon", overdue: "Overdue", completed: "Completed" }[status] || status;
  return (
    <div className="mt-1">
      <Stamp tone={tone} size="sm">
        {label}
      </Stamp>
    </div>
  );
}

function ResubmitDoc({ doc, caseId, snapshot, onDone }) {
  const [busy, setBusy] = useState(false);
  const schemaDoc = (snapshot?.documents || []).find((d) => d.doc_key === doc.doc_key);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (schemaDoc?.max_size_mb) {
      const maxBytes = schemaDoc.max_size_mb * 1024 * 1024;
      if (file.size > maxBytes) {
        toast.error(`File too large — max ${schemaDoc.max_size_mb}MB`);
        return;
      }
    }
    if (schemaDoc?.formats?.length) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!schemaDoc.formats.includes(ext)) {
        toast.error(`Use ${schemaDoc.formats.join(", ").toUpperCase()}`);
        return;
      }
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await api.post("/documents/upload", form);
      await api.post(`/cases/${caseId}/documents/${doc.id}/resubmit`, {
        file_url: up.data.file_url,
        filename: up.data.filename,
        storage_key: up.data.storage_key || up.data.key || null,
      });
      toast.success("Document re-uploaded — we'll review shortly.");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-3 flex items-start gap-4 border-b last:border-0 border-border">
      <RefreshCw className="w-5 h-5 text-danger shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-medium text-sm">{doc.doc_name}</div>
        <div className="text-sm text-ink-muted mt-1">Reason: {doc.rejection_reason || "Not specified"}</div>
      </div>
      <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm border border-danger text-danger rounded-full px-3 py-1.5 hover:bg-danger hover:text-white transition-colors">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Re-upload
        <input type="file" hidden onChange={handle} data-testid={`resubmit-${doc.doc_key}`} accept={(schemaDoc?.formats || []).map((f) => `.${f}`).join(",") || undefined} />
      </label>
    </div>
  );
}
