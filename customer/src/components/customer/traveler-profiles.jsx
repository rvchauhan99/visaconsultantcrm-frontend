"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, User, Users } from "lucide-react";
import api from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useTravelerProfiles } from "@/hooks/customer-api";
import Stamp from "@/components/ui/stamp";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/phone-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { isValidPhoneOptional, normalizePhoneValue } from "@/lib/phone";
import PassportScanner from "@/components/passport/PassportScanner";
import OCRFieldStatus from "@/components/passport/OCRFieldStatus";
import { buildFieldStatuses } from "@/config/passportFieldMap";

const RELATIONSHIPS = ["self", "spouse", "child", "parent", "other"];

const NATIONALITY_OPTIONS = [
  { value: "IND", label: "Indian (IND)" },
  { value: "NPL", label: "Nepalese (NPL)" },
  { value: "BGD", label: "Bangladeshi (BGD)" },
  { value: "LKA", label: "Sri Lankan (LKA)" },
  { value: "OTHER", label: "Other" },
];

export default function TravelerProfiles() {
  const { data: list = [], isLoading } = useTravelerProfiles(true);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = () => qc.invalidateQueries({ queryKey: queryKeys.travelers });

  const save = async (form, id) => {
    if (!isValidPhoneOptional(form.phone)) {
      toast.error("Enter a valid phone number for the selected country");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        full_name: form.full_name,
        relationship: form.relationship || "self",
        dob: form.dob || null,
        passport_issue_date: form.passport_issue_date || null,
        passport_expiry_date: form.passport_expiry_date || null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        phone: form.phone || null,
        email: form.email || null,
      };
      if (form.passport_number) payload.passport_number = form.passport_number;
      if (id === "new") await api.post("/customers/me/traveler-profiles", payload);
      else await api.patch(`/customers/me/traveler-profiles/${id}`, payload);
      toast.success("Saved");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this traveler?")) return;
    await api.delete(`/customers/me/traveler-profiles/${id}`);
    toast.success("Removed");
    reload();
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Card variant="glass" className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-navy" />
          <h2 className="font-display text-lg text-navy">Saved travelers</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing("new")} data-testid="add-traveler-btn" type="button">
          <Plus className="w-4 h-4" /> Add traveler
        </Button>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          {editing && (
            <TravelerEditor
              profile={editing === "new" ? null : list.find((p) => p.id === editing)}
              onCancel={() => setEditing(null)}
              onSave={(form) => save(form, editing)}
              busy={busy}
            />
          )}
        </DialogContent>
      </Dialog>

      {list.length === 0 && !editing ? (
        <div className="text-center py-10 border border-dashed border-white/70 rounded-xl bg-white/35 backdrop-blur-sm">
          <Stamp tone="gold" size="sm" className="mx-auto mb-3">
            No travelers yet
          </Stamp>
          <p className="text-sm text-ink-muted mb-4">Add yourself, or a family member, to speed up your next application.</p>
          <Button onClick={() => setEditing("new")} type="button">
            Add your first traveler
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between" data-testid={`traveler-row-${p.id.slice(0, 6)}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
                  <User className="w-4 h-4 text-navy" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {p.full_name} <span className="ml-1 text-[10px] uppercase font-mono tracking-widest text-ink-muted">{p.relationship}</span>
                  </div>
                  <div className="text-xs font-mono text-ink-muted">{p.passport_number_masked || "No passport on file"}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-ink-muted hover:text-ink" onClick={() => setEditing(p.id)} aria-label="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" className="p-2 text-ink-muted hover:text-danger" onClick={() => remove(p.id)} aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TravelerEditor({ profile, onCancel, onSave, busy }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    relationship: profile?.relationship || "self",
    dob: profile?.dob || "",
    passport_number: "",
    passport_issue_date: profile?.passport_issue_date || "",
    passport_expiry_date: profile?.passport_expiry_date || "",
    gender: profile?.gender || "",
    nationality: profile?.nationality || "IND",
    phone: normalizePhoneValue(profile?.phone || ""),
    email: profile?.email || "",
  });
  const [ocrStatuses, setOcrStatuses] = useState({});

  const upd = (k, v) => {
    setOcrStatuses((s) => {
      if (!s[k]) return s;
      const next = { ...s };
      delete next[k];
      return next;
    });
    setForm((p) => ({ ...p, [k]: v }));
  };

  return (
    <div data-testid="traveler-editor">
      <DialogHeader>
        <DialogTitle>{profile ? "Edit traveler" : "New traveler"}</DialogTitle>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <PassportScanner
          traveler={form}
          setTraveler={(updater) => {
            setForm((prev) => {
              const next = typeof updater === "function" ? updater(prev) : updater;
              return { ...prev, ...next };
            });
          }}
          onStatuses={(data) => setOcrStatuses(buildFieldStatuses(data))}
          onManual={() => setOcrStatuses({})}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <Input value={form.full_name} onChange={(e) => upd("full_name", e.target.value)} data-testid="traveler-profile-name" />
            <OCRFieldStatus status={ocrStatuses.full_name} />
          </Field>
          <Field label="Relationship">
            <SearchableSelect
              clearable={false}
              value={form.relationship}
              onChange={(v) => upd("relationship", v || "self")}
              options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
              searchPlaceholder="Search…"
            />
          </Field>
          <Field label="Date of birth">
            <DatePicker
              value={form.dob || null}
              onChange={(v) => upd("dob", v || "")}
              fromYear={1940}
              toYear={new Date().getFullYear()}
            />
            <OCRFieldStatus status={ocrStatuses.dob} />
          </Field>
          <Field label="Passport number" hint={profile ? "Leave blank to keep existing" : undefined}>
            <Input
              value={form.passport_number}
              onChange={(e) => upd("passport_number", e.target.value.toUpperCase())}
              data-testid="traveler-profile-passport"
            />
            <OCRFieldStatus status={ocrStatuses.passport_number} />
          </Field>
          <Field label="Passport issue">
            <DatePicker
              value={form.passport_issue_date || null}
              onChange={(v) => upd("passport_issue_date", v || "")}
              fromYear={1990}
              toYear={new Date().getFullYear()}
            />
            <OCRFieldStatus status={ocrStatuses.passport_issue_date} />
          </Field>
          <Field label="Passport expiry">
            <DatePicker
              value={form.passport_expiry_date || null}
              onChange={(v) => upd("passport_expiry_date", v || "")}
              fromYear={new Date().getFullYear() - 1}
              toYear={new Date().getFullYear() + 20}
            />
            <OCRFieldStatus status={ocrStatuses.passport_expiry_date} />
          </Field>
          <Field label="Gender">
            <SearchableSelect
              clearable
              placeholder="Select…"
              value={form.gender || null}
              onChange={(v) => upd("gender", v || "")}
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
              searchPlaceholder="Search…"
            />
            <OCRFieldStatus status={ocrStatuses.gender} />
          </Field>
          <Field label="Nationality">
            <SearchableSelect
              clearable
              placeholder="Select…"
              value={form.nationality || null}
              onChange={(v) => upd("nationality", v || "")}
              options={NATIONALITY_OPTIONS}
              searchPlaceholder="Search…"
            />
            <OCRFieldStatus status={ocrStatuses.nationality} />
          </Field>
          <Field label="Phone">
            <PhoneField
              variant="static"
              value={form.phone}
              onChange={(v) => upd("phone", v)}
              error={(form.phone || "").trim() && !isValidPhoneOptional(form.phone) ? "Invalid for selected country" : undefined}
            />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} />
          </Field>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          disabled={busy || !form.full_name}
          onClick={() => onSave(form)}
          type="button"
          data-testid="traveler-profile-save"
        >
          Save traveler
        </Button>
      </DialogFooter>
    </div>
  );
}
