import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import api, { getUser, viewUrl, downloadUrl } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ArrowRight, Pencil, AlertTriangle, PauseCircle, Plus, FileCheck, FileX, Clock, ChevronLeft, Eye, Download } from "lucide-react";
import { ConsultantSelect } from "@/components/forms/selects";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { CrmCard, CrmTableCard, CrmCardHeader, CrmEmptyState } from "@/components/ui/crm-card";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmField, CrmInput, CrmTextarea } from "@/components/ui/crm-field";
import { DatePicker } from "@/components/ui/date-picker";
import { cn, formatCaseNumber } from "@/lib/utils";

const STAGES = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
const STAGE_LABELS = {
  new: "New", docs_pending: "Docs pending", ready_to_submit: "Ready to submit",
  submitted: "Submitted", decision: "Decision", closed: "Closed",
};
const SLA_STAMP = { on_track: "success", due_soon: "warning", overdue: "danger", completed: "gold" };
const DOC_STAMP = { verified: "success", rejected: "danger", received: "teal", requested: "muted" };
const PAY_STAMP = { paid: "success", partial: "warning", refunded: "muted", pending: "warning" };

export default function CaseDetail() {
  const { caseId } = useParams();
  const [data, setData] = useState(null);
  const [noteBody, setNoteBody] = useState("");
  const user = getUser();

  const load = () => api.get(`/crm/cases/${caseId}`).then((r) => setData(r.data));
  useEffect(() => { load(); }, [caseId]); // eslint-disable-line

  if (!data) return (
    <div className="p-6 flex flex-col gap-3">
      {[0,1,2].map((i) => (
        <div key={i} className="h-16 rounded-[10px] border border-border bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]" />
      ))}
    </div>
  );

  const { case: c, customer, consultant, documents, field_values, activity, notes = [], tasks = [], valid_next_stages, has_duplicate_flag, duplicate_open_applications = [] } = data;

  const advance = async (target) => {
    try {
      await api.patch(`/crm/cases/${caseId}/stage`, { target_stage: target });
      toast.success(`Stage → ${STAGE_LABELS[target]}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const verify = async (docId) => {
    await api.post(`/crm/cases/${caseId}/documents/${docId}/verify`, {});
    toast.success("Verified"); load();
  };
  const reject = async (docId) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    await api.post(`/crm/cases/${caseId}/documents/${docId}/reject`, { reason });
    toast.success("Rejected — customer notified"); load();
  };
  const reassign = async (cid) => {
    try {
      await api.patch(`/crm/cases/${caseId}/reassign`, { consultant_id: cid });
      toast.success("Reassigned"); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const recordDecision = async (outcome) => {
    try {
      await api.post(`/crm/cases/${caseId}/decision`, { outcome });
      toast.success(`Decision: ${outcome}`); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const addNote = async () => {
    const body = noteBody.trim();
    if (!body) return;
    try {
      await api.post(`/crm/cases/${caseId}/notes`, { body });
      setNoteBody(""); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to add note"); }
  };
  const editField = async (fieldKey, value) => {
    try {
      await api.patch(`/crm/cases/${caseId}/fields`, { field_key: fieldKey, value });
      toast.success("Field updated"); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const createTask = async ({ description, due_date, assigned_to }) => {
    try {
      await api.post("/crm/tasks", {
        case_id: caseId,
        description,
        due_date: due_date || null,
        assigned_to: assigned_to || getUser()?.id || null,
      });
      toast.success("Task created"); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const completeTask = async (taskId) => {
    try {
      await api.patch(`/crm/tasks/${taskId}/done`);
      toast.success("Task marked done"); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const currentStageIdx = STAGES.indexOf(c.stage);

  return (
    <div className="p-6 space-y-4">
      {/* Back */}
      <Link
        to="/pipeline"
        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
        data-testid="case-back"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Pipeline
      </Link>

      {/* Duplicate banner */}
      {has_duplicate_flag && (
        <div className="flex items-start gap-2.5 bg-warning/8 border border-warning/40 rounded-[10px] p-3 text-sm" data-testid="duplicate-banner">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-warning">Duplicate open application detected</div>
            <div className="text-xs text-ink-muted mt-0.5">
              {duplicate_open_applications.map((d, i) => (
                <React.Fragment key={d.id}>
                  {i > 0 && ", "}
                  <Link to={`/cases/${d.id}`} className="underline font-mono">{formatCaseNumber(d)} ({d.stage})</Link>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Header card ── */}
      <CrmCard className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">Case {formatCaseNumber(c)}</div>
            <h1 className="text-xl font-semibold flex items-center gap-2.5">
              <span className="text-2xl">{c.config_snapshot_json.country_flag}</span>
              <span>{c.config_snapshot_json.country_name} · <span className="font-normal text-ink-muted">{c.config_snapshot_json.visa_type}</span></span>
            </h1>
            <div className="text-sm text-ink-muted mt-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted mr-2">Contact</span>
              {customer?.full_name}
              {customer?.email && (
                <> · <a href={`mailto:${customer.email}`} className="font-mono text-xs text-teal hover:underline">{customer.email}</a></>
              )}
              {customer?.phone && (
                <> · <a href={`tel:${customer.phone}`} className="font-mono text-xs text-teal hover:underline">{customer.phone}</a></>
              )}
              <span className="mx-2 text-border">·</span>
              <span className="font-mono text-xs uppercase">{c.source}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              {c.on_hold && (
                <Stamp tone="warning" size="sm" data-testid="case-on-hold-badge">
                  <PauseCircle className="w-3 h-3" /> On hold
                </Stamp>
              )}
              <Stamp tone={c.stage === "closed" ? "gold" : "ink"} size="md">{STAGE_LABELS[c.stage]}</Stamp>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-ink-muted">
              <Clock className="w-3 h-3" />
              Due {c.sla_due_date}
              <Stamp tone={SLA_STAMP[c.sla_status] ?? "muted"} size="sm" className="ml-1">
                {c.sla_status?.replace("_", " ")}
              </Stamp>
            </div>
          </div>
        </div>

        {/* Stage stepper */}
        <div className="flex items-center mb-4 relative">
          {STAGES.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <motion.div
                  initial={false}
                  animate={{ scale: i === currentStageIdx ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold z-10 relative shadow-sm",
                    i < currentStageIdx ? "border-navy bg-navy text-white shadow-navy/20"
                    : i === currentStageIdx ? "border-navy bg-white text-navy ring-4 ring-navy/10"
                    : "border-border bg-surface text-ink-muted"
                  )}
                >
                  {i < currentStageIdx ? <Check className="w-2.5 h-2.5" /> : i + 1}
                </motion.div>
                <div className={cn(
                  "text-[9px] font-mono uppercase tracking-wider mt-1 text-center",
                  i === currentStageIdx ? "text-navy font-semibold" : "text-ink-muted"
                )}>
                  {STAGE_LABELS[s]}
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div className="h-0.5 flex-1 -mt-4 mx-0.5 bg-border overflow-hidden relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-navy"
                    initial={{ width: "0%" }}
                    animate={{ width: i < currentStageIdx ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {valid_next_stages.map((s) => (
            <CrmButton key={s} variant="outline" size="sm" onClick={() => advance(s)} data-testid={`case-advance-${s}`}>
              <ArrowRight className="w-3.5 h-3.5" />
              {STAGE_LABELS[s]}
            </CrmButton>
          ))}
          {c.stage === "submitted" && (
            <>
              <CrmButton variant="success" size="sm" onClick={() => recordDecision("approved")} data-testid="case-decide-approved">Approved</CrmButton>
              <CrmButton variant="danger" size="sm" onClick={() => recordDecision("rejected")} data-testid="case-decide-rejected">Rejected</CrmButton>
              <CrmButton variant="outline" size="sm" onClick={() => recordDecision("rfi")} data-testid="case-decide-rfi">RFI</CrmButton>
            </>
          )}
          {(user?.role === "admin" || user?.sub === consultant?.id) && (
            <div className="w-52" data-testid="case-reassign">
              <ConsultantSelect
                value={null}
                onChange={(cid) => { if (cid) reassign(cid); }}
                placeholder="Reassign…"
                testId="case-reassign-select"
                clearable={false}
              />
            </div>
          )}
        </div>
      </CrmCard>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview">
        <TabsList
          className="bg-surface-card border border-border rounded-[10px] h-auto p-1 flex gap-0.5"
          data-testid="case-tabs"
        >
          {["overview", "documents", "payment", "tasks", "notes", "comms", "activity"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className={cn(
                "text-[11px] uppercase font-mono tracking-wider px-3 py-1.5 rounded-md transition-all",
                "data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-ink-muted data-[state=inactive]:hover:text-ink",
              )}
              data-testid={`case-tab-${t}`}
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            <CrmTableCard>
              <CrmCardHeader label="Traveler" title="Traveler details" />
              <dl className="text-sm divide-y divide-border">
                {Object.entries(c.traveler || {}).map(([k, v]) => v && (
                  <div key={k} className="flex justify-between px-4 py-2">
                    <dt className="text-ink-muted capitalize">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-mono text-xs">{v}</dd>
                  </div>
                ))}
              </dl>
            </CrmTableCard>
            <CrmTableCard>
              <CrmCardHeader label="Fields" title="Custom fields" />
              <dl className="text-sm divide-y divide-border" data-testid="custom-fields-list">
                {field_values.length === 0
                  ? <div className="px-4 py-3 text-xs text-ink-muted italic">None captured</div>
                  : field_values.map((f) => (
                    <div key={f.field_key} className="px-4 py-2">
                      <EditableField f={f} onSave={editField} />
                    </div>
                  ))}
              </dl>
            </CrmTableCard>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <CrmTableCard className="mt-3" data-testid="case-docs">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Required</th>
                  <th>Status</th>
                  <th>File</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.doc_name || d.doc_key}</td>
                    <td>
                      <Stamp tone={d.required ? "navy" : "muted"} size="sm">
                        {d.required ? "yes" : "no"}
                      </Stamp>
                    </td>
                    <td>
                      <Stamp tone={DOC_STAMP[d.status] ?? "muted"} size="sm">{d.status}</Stamp>
                    </td>
                    <td className="font-mono text-xs">
                      {d.file_url ? (
                        <span className="flex flex-col gap-1">
                          <span className="truncate max-w-[140px] block text-ink-muted" title={d.filename}>{d.filename || d.doc_key}</span>
                          <span className="inline-flex items-center gap-1.5">
                            <a
                              href={viewUrl(d.file_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-navy hover:underline"
                              data-testid={`crm-doc-view-${d.doc_key}`}
                              title={`View ${d.filename || "document"}`}
                            >
                              <Eye className="w-3 h-3" /> View
                            </a>
                            <span className="text-border">·</span>
                            <a
                              href={downloadUrl(d.file_url, d.filename)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-ink-muted hover:text-ink"
                              data-testid={`crm-doc-download-${d.doc_key}`}
                              title={`Download ${d.filename || "document"}`}
                            >
                              <Download className="w-3 h-3" /> Download
                            </a>
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-muted italic">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      {d.status === "received" ? (
                        <div className="inline-flex gap-1.5">
                          <CrmButton variant="success" size="icon-sm" onClick={() => verify(d.id)} data-testid={`doc-verify-${d.doc_key}`} title="Verify">
                            <FileCheck className="w-3 h-3" />
                          </CrmButton>
                          <CrmButton variant="danger" size="icon-sm" onClick={() => reject(d.id)} data-testid={`doc-reject-${d.doc_key}`} title="Reject">
                            <FileX className="w-3 h-3" />
                          </CrmButton>
                        </div>
                      ) : d.status === "verified" ? (
                        <span className="text-[10px] font-mono text-success uppercase">Locked</span>
                      ) : d.status === "rejected" ? (
                        <span className="text-[10px] font-mono text-danger uppercase" title={d.rejection_reason || ""}>Rejected</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CrmTableCard>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment">
          <CrmCard className="mt-3 p-5" data-testid="payment-panel">
            <div className="grid grid-cols-2 gap-3 text-sm max-w-xs">
              <span className="text-ink-muted">Status</span>
              <Stamp tone={PAY_STAMP[c.payment_status] ?? "muted"} size="sm">{c.payment_status}</Stamp>
              <span className="text-ink-muted">Amount</span>
              <span className="font-mono font-semibold">₹{Number(c.total_amount || 0).toLocaleString("en-IN")}</span>
              <span className="text-ink-muted">Method</span>
              <span className="font-mono text-xs">{c.payment_method || "—"}</span>
              <span className="text-ink-muted">Reference</span>
              <span className="font-mono text-xs">{c.payment_reference || "—"}</span>
            </div>
          </CrmCard>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <TasksPanel tasks={tasks} onCreate={createTask} onComplete={completeTask} />
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <CrmCard className="mt-3 p-4" data-testid="notes-panel">
            <div className="space-y-2 mb-4">
              <CrmTextarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add an internal note (staff only, not visible to customer)…"
                rows={3}
                data-testid="note-input"
              />
              <div className="flex justify-end">
                <CrmButton
                  variant="solid"
                  size="sm"
                  onClick={addNote}
                  disabled={!noteBody.trim()}
                  data-testid="note-submit"
                >
                  Add note
                </CrmButton>
              </div>
            </div>
            <ul className="divide-y divide-border border-t border-border" data-testid="notes-list">
              {notes.length === 0 && (
                <li className="py-4">
                  <CrmEmptyState title="No internal notes yet" />
                </li>
              )}
              {notes.map((n) => (
                <li key={n.id} className="py-3">
                  <div className="text-[10px] font-mono text-ink-muted uppercase tracking-widest mb-1">
                    {new Date(n.created_at).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-ink">{n.note}</div>
                </li>
              ))}
            </ul>
          </CrmCard>
        </TabsContent>

        {/* Communications */}
        <TabsContent value="comms">
          <CaseCommsPanel caseId={caseId} />
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <CrmTableCard className="mt-3">
            <ul className="divide-y divide-border" data-testid="activity-log">
              {activity.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-start gap-4">
                  <span className="text-[10px] font-mono text-ink-muted whitespace-nowrap w-36 shrink-0 mt-0.5">
                    {new Date(a.created_at).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] font-mono uppercase text-teal w-24 shrink-0">{a.action}</span>
                  <span className="text-xs text-ink">{a.note}</span>
                </li>
              ))}
              {activity.length === 0 && <li><CrmEmptyState title="No activity recorded yet" /></li>}
            </ul>
          </CrmTableCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── EditableField ─── */
function EditableField({ f, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(f.value ?? "");

  if (editing) {
    return (
      <div className="flex justify-between items-center gap-2" data-testid={`field-edit-row-${f.field_key}`}>
        <span className="text-ink-muted capitalize text-xs">{f.field_key.replace(/_/g, " ")}</span>
        <div className="flex items-center gap-1">
          <CrmInput
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-32 text-xs"
            data-testid={`field-edit-input-${f.field_key}`}
          />
          <CrmButton variant="success" size="icon-sm" onClick={() => { onSave(f.field_key, val); setEditing(false); }} data-testid={`field-edit-save-${f.field_key}`}>
            <Check className="w-3 h-3" />
          </CrmButton>
          <CrmButton variant="outline" size="icon-sm" onClick={() => { setVal(f.value ?? ""); setEditing(false); }}>
            <X className="w-3 h-3" />
          </CrmButton>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center group" data-testid={`field-row-${f.field_key}`}>
      <span className="text-ink-muted capitalize text-xs">{f.field_key.replace(/_/g, " ")}</span>
      <div className="flex items-center gap-1.5 font-mono text-xs">
        {f.value}
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-navy transition-opacity"
          data-testid={`field-edit-${f.field_key}`}
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/* ─── CaseCommsPanel ─── */
function CaseCommsPanel({ caseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/crm/communications", { params: { case_id: caseId } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data?.items || [])))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [caseId]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await api.post("/crm/communications", {
        case_id: caseId,
        channel,
        subject: subject.trim() || null,
        body: body.trim(),
        direction: "outbound",
      });
      toast.success("Logged");
      setSubject("");
      setBody("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to log communication");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrmCard className="mt-3 p-4" data-testid="comms-panel">
      <form onSubmit={submit} className="space-y-3 mb-4 border-b border-border pb-4">
        <div className="grid md:grid-cols-[140px_1fr] gap-2">
          <CrmField label="Channel">
            <SearchableSelect
              clearable={false}
              value={channel}
              onChange={(v) => setChannel(v || "email")}
              data-testid="comms-channel"
              options={[
                { value: "email", label: "Email" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "sms", label: "SMS" },
                { value: "call", label: "Call" },
                { value: "portal", label: "Portal" },
                { value: "other", label: "Other" },
              ]}
            />
          </CrmField>
          <CrmField label="Subject">
            <CrmInput value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="comms-subject" />
          </CrmField>
        </div>
        <CrmField label="Body" required>
          <CrmTextarea rows={3} required value={body} onChange={(e) => setBody(e.target.value)} data-testid="comms-body" />
        </CrmField>
        <div className="flex justify-end">
          <CrmButton type="submit" variant="solid" size="sm" loading={saving} data-testid="comms-submit">
            Log communication
          </CrmButton>
        </div>
      </form>
      {loading ? (
        <div className="text-xs text-ink-muted py-4">Loading…</div>
      ) : rows.length === 0 ? (
        <CrmEmptyState title="No communications logged" />
      ) : (
        <ul className="divide-y divide-border" data-testid="comms-list">
          {rows.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center gap-2 mb-1">
                <Stamp tone="muted" size="sm">{r.channel || "—"}</Stamp>
                <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">
                  {r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : ""}
                </span>
              </div>
              {r.subject && <div className="text-xs font-medium text-ink mb-0.5">{r.subject}</div>}
              {r.body && <div className="text-sm text-ink whitespace-pre-wrap">{r.body}</div>}
            </li>
          ))}
        </ul>
      )}
    </CrmCard>
  );
}

/* ─── TasksPanel ─── */
function TasksPanel({ tasks, onCreate, onComplete }) {
  const me = getUser();
  const [showNew, setShowNew] = useState(false);
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [assignedTo, setAssignedTo] = useState(me?.id || null);
  const now = new Date();
  const isOverdue = (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < now;

  const openForm = () => {
    setShowNew((s) => {
      if (!s) setAssignedTo(me?.id || null);
      return !s;
    });
  };

  const submit = () => {
    if (!desc.trim()) return;
    onCreate({ description: desc.trim(), due_date: due, assigned_to: assignedTo || me?.id });
    setDesc(""); setDue(""); setAssignedTo(me?.id || null); setShowNew(false);
  };

  return (
    <CrmCard className="mt-3 p-4" data-testid="tasks-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Case tasks</div>
        <CrmButton variant="outline" size="sm" onClick={openForm} data-testid="task-new-btn">
          <Plus className="w-3 h-3" /> New task
        </CrmButton>
      </div>

      {showNew && (
        <div className="grid md:grid-cols-[1fr_140px_1fr_auto] gap-2 mb-3 items-end" data-testid="task-new-form">
          <CrmField label="Description">
            <CrmInput value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="task-desc-input" />
          </CrmField>
          <CrmField label="Due date">
            <DatePicker
              value={due || null}
              onChange={(v) => setDue(v || "")}
              data-testid="task-due-input"
            />
          </CrmField>
          <CrmField label="Assigned to">
            <ConsultantSelect
              value={assignedTo}
              onChange={(id) => setAssignedTo(id || me?.id || null)}
              placeholder="Select owner…"
              testId="task-assignee-select"
            />
          </CrmField>
          <CrmButton variant="solid" size="sm" onClick={submit} disabled={!desc.trim()} data-testid="task-create-submit" className="mt-5">
            Create
          </CrmButton>
        </div>
      )}

      <ul className="divide-y divide-border border-t border-border" data-testid="tasks-list">
        {tasks.length === 0 && (
          <li className="py-4"><CrmEmptyState title="No tasks on this case" /></li>
        )}
        {tasks.map((t) => (
          <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={cn("text-sm truncate", t.status === "done" && "line-through text-ink-muted")}>
                {t.description}
              </div>
              <div className="text-[10px] font-mono text-ink-muted mt-0.5">
                {t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString("en-IN")}` : "No due date"}
                {" · "}
                Owner · {t.assigned_name || "—"}
              </div>
            </div>
            {t.status === "done" ? (
              <Stamp tone="success" size="sm">done</Stamp>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {isOverdue(t) && <Stamp tone="danger" size="sm">overdue</Stamp>}
                <CrmButton variant="success" size="icon-sm" onClick={() => onComplete(t.id)} data-testid={`task-done-${t.id}`} title="Mark done">
                  <Check className="w-3 h-3" />
                </CrmButton>
              </div>
            )}
          </li>
        ))}
      </ul>
    </CrmCard>
  );
}
