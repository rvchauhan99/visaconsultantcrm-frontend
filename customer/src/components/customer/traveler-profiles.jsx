"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, User, Users, X } from "lucide-react";
import api from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useTravelerProfiles } from "@/hooks/customer-api";
import Stamp from "@/components/ui/stamp";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const RELATIONSHIPS = ["self", "spouse", "child", "parent", "other"];

export default function TravelerProfiles() {
  const { data: list = [], isLoading } = useTravelerProfiles(true);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = () => qc.invalidateQueries({ queryKey: queryKeys.travelers });

  const save = async (form, id) => {
    setBusy(true);
    try {
      if (id === "new") await api.post("/customers/me/traveler-profiles", form);
      else await api.patch(`/customers/me/traveler-profiles/${id}`, form);
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
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-navy" />
          <h2 className="font-display text-lg text-navy">Saved travelers</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing("new")} data-testid="add-traveler-btn" type="button">
          <Plus className="w-4 h-4" /> Add traveler
        </Button>
      </div>

      {editing && (
        <TravelerEditor profile={editing === "new" ? null : list.find((p) => p.id === editing)} onCancel={() => setEditing(null)} onSave={(form) => save(form, editing)} busy={busy} />
      )}

      {list.length === 0 && !editing ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl bg-surface">
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
    phone: profile?.phone || "",
    email: profile?.email || "",
  });

  return (
    <div className="mb-4 p-4 border border-border rounded-xl bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">{profile ? "Edit traveler" : "New traveler"}</div>
        <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Full name" required>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Relationship">
          <Select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
        </Field>
        <Field label="Passport number" hint={profile ? "Leave blank to keep existing" : undefined}>
          <Input value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Passport issue">
          <Input type="date" value={form.passport_issue_date} onChange={(e) => setForm({ ...form, passport_issue_date: e.target.value })} />
        </Field>
        <Field label="Passport expiry">
          <Input type="date" value={form.passport_expiry_date} onChange={(e) => setForm({ ...form, passport_expiry_date: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          disabled={busy || !form.full_name}
          onClick={() => {
            const payload = { ...form };
            if (!payload.passport_number) delete payload.passport_number;
            onSave(payload);
          }}
          type="button"
        >
          Save traveler
        </Button>
      </div>
    </div>
  );
}
