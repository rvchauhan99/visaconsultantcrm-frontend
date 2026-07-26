import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmField, CrmInput, CrmSelect, CrmTextarea } from "@/components/ui/crm-field";

export const FOLLOW_UP_OUTCOMES = [
  { value: "follow_up", label: "Follow up" },
  { value: "callback", label: "Callback scheduled" },
  { value: "no_answer", label: "No answer" },
  { value: "switched_off", label: "Switched off" },
  { value: "interested", label: "Interested / qualified" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "invalid", label: "Invalid lead" },
  { value: "converted", label: "Ready to convert" },
];

export const FOLLOW_UP_CHANNELS = [
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In person" },
  { value: "other", label: "Other" },
];

const LOST_OUTCOMES = new Set(["not_interested", "wrong_number", "invalid"]);

function localInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Log a lead follow-up. When forcedStatus is set (board drag), outcome constraints apply.
 */
export default function AddLeadFollowUpForm({
  lead,
  forcedStatus = null,
  onDone,
  onCancel,
  onNeedsConvert,
}) {
  const nowLocal = useMemo(() => localInputValue(new Date().toISOString()), []);
  const [channel, setChannel] = useState("phone");
  const [outcome, setOutcome] = useState(() => {
    if (forcedStatus === "lost") return "not_interested";
    if (forcedStatus === "qualified") return "interested";
    if (forcedStatus === "contacted") return "follow_up";
    if (forcedStatus === "converted") return "converted";
    return "follow_up";
  });
  const [notes, setNotes] = useState("");
  const [contactedAt, setContactedAt] = useState(nowLocal);
  const [nextAt, setNextAt] = useState("");
  const [saving, setSaving] = useState(false);

  const outcomeOptions = useMemo(() => {
    if (forcedStatus === "lost") {
      return FOLLOW_UP_OUTCOMES.filter((o) => LOST_OUTCOMES.has(o.value));
    }
    if (forcedStatus === "converted") {
      return FOLLOW_UP_OUTCOMES.filter((o) => o.value === "converted");
    }
    return FOLLOW_UP_OUTCOMES;
  }, [forcedStatus]);

  const submit = async (e) => {
    e.preventDefault();
    if (!lead?.id) return;
    if (forcedStatus === "lost" && !LOST_OUTCOMES.has(outcome)) {
      toast.error("Choose a lost outcome");
      return;
    }
    if ((outcome === "follow_up" || outcome === "callback") && !nextAt) {
      toast.error("Next follow-up date is required for this outcome");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        channel,
        outcome,
        notes: notes.trim() || null,
        contacted_at: toIso(contactedAt) || new Date().toISOString(),
        next_follow_up_at: toIso(nextAt),
      };
      if (forcedStatus && forcedStatus !== "converted") {
        payload.forced_status = forcedStatus;
      }
      const r = await api.post(`/crm/leads/${lead.id}/follow-ups`, payload);
      toast.success("Follow-up logged");
      if (r.data?.needs_convert || outcome === "converted" || forcedStatus === "converted") {
        onNeedsConvert?.(lead, r.data?.lead);
      } else {
        onDone?.(r.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save follow-up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="lead-follow-up-form">
      <div className="text-sm text-ink">
        <span className="font-semibold">{lead?.full_name || "Lead"}</span>
        {lead?.phone ? <span className="text-ink-muted font-mono text-xs ml-2">{lead.phone}</span> : null}
        {forcedStatus ? (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-muted">
            → {forcedStatus}
          </span>
        ) : null}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <CrmField label="Contacted at" required>
          <CrmInput
            type="datetime-local"
            required
            value={contactedAt}
            onChange={(e) => setContactedAt(e.target.value)}
            data-testid="fu-contacted-at"
          />
        </CrmField>
        <CrmField label="Channel" required>
          <CrmSelect value={channel} onChange={(e) => setChannel(e.target.value)} data-testid="fu-channel">
            {FOLLOW_UP_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </CrmSelect>
        </CrmField>
        <CrmField label="Result / outcome" required>
          <CrmSelect value={outcome} onChange={(e) => setOutcome(e.target.value)} data-testid="fu-outcome">
            {outcomeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </CrmSelect>
        </CrmField>
        <CrmField label="Next follow-up" required={outcome === "follow_up" || outcome === "callback"}>
          <CrmInput
            type="datetime-local"
            value={nextAt}
            onChange={(e) => setNextAt(e.target.value)}
            data-testid="fu-next-at"
          />
        </CrmField>
      </div>

      <CrmField label="Notes" required={forcedStatus === "lost"}>
        <CrmTextarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Call notes…"
          data-testid="fu-notes"
        />
      </CrmField>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <CrmButton type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</CrmButton>
        ) : null}
        <CrmButton type="submit" variant="solid" size="sm" loading={saving} data-testid="fu-submit">
          Save follow-up
        </CrmButton>
      </div>
    </form>
  );
}
