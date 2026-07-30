"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Cake, Heart, Pencil, Save, X } from "lucide-react";
import { useCustomerMe, useUpdateCustomerMe } from "@/hooks/customer-api";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/phone-field";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { formatInDate } from "@/lib/utils";
import { isValidPhoneOptional, normalizePhoneValue } from "@/lib/phone";

export default function CustomerProfile() {
  const { data: me, isLoading } = useCustomerMe(true);
  const updateMe = useUpdateCustomerMe();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  if (isLoading) return <Skeleton className="h-40" />;
  if (!me) return null;

  const startEdit = () => {
    setForm({ ...me, phone: normalizePhoneValue(me.phone || "") });
    setEditing(true);
  };

  const save = async () => {
    if (!isValidPhoneOptional(form.phone)) {
      toast.error("Enter a valid phone number for the selected country");
      return;
    }
    try {
      await updateMe.mutateAsync({
        full_name: form.full_name,
        phone: form.phone || null,
        dob: form.dob || null,
        anniversary_date: form.anniversary_date || null,
      });
      toast.success("Profile saved");
      setEditing(false);
    } catch {
      toast.error("Failed to save profile");
    }
  };

  const nice = (v) => (v ? formatInDate(v, { day: "numeric", month: "long" }) : "—");

  return (
    <Card className="p-5 md:p-6" data-testid="customer-profile">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-navy">Your profile</h2>
        {!editing && (
          <button onClick={startEdit} className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1.5" data-testid="edit-profile-btn" type="button">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {!editing ? (
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-ink-muted">Full name</dt>
          <dd>{me.full_name}</dd>
          <dt className="text-ink-muted">Phone</dt>
          <dd>{me.phone || "—"}</dd>
          <dt className="text-ink-muted inline-flex items-center gap-1.5">
            <Cake className="w-4 h-4" /> Birthday
          </dt>
          <dd data-testid="profile-dob">{nice(me.dob)}</dd>
          <dt className="text-ink-muted inline-flex items-center gap-1.5">
            <Heart className="w-4 h-4" /> Anniversary
          </dt>
          <dd data-testid="profile-anniversary">{nice(me.anniversary_date)}</dd>
        </dl>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Full name">
            <Input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="profile-name-input" />
          </Field>
          <Field label="Phone">
            <PhoneField
              variant="static"
              value={form.phone || ""}
              onChange={(v) => setForm({ ...form, phone: v })}
              data-testid="profile-phone-input"
              error={(form.phone || "").trim() && !isValidPhoneOptional(form.phone) ? "Invalid for selected country" : undefined}
            />
          </Field>
          <Field label="Birthday">
            <DatePicker
              value={form.dob || null}
              onChange={(v) => setForm({ ...form, dob: v || "" })}
              data-testid="profile-dob-input"
              fromYear={1940}
              toYear={new Date().getFullYear()}
            />
          </Field>
          <Field label="Anniversary">
            <DatePicker
              value={form.anniversary_date || null}
              onChange={(v) => setForm({ ...form, anniversary_date: v || "" })}
              data-testid="profile-anniversary-input"
            />
          </Field>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditing(false)} type="button">
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button onClick={save} disabled={updateMe.isPending} data-testid="profile-save" type="button">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-ink-muted mt-4">We&apos;ll send you a small message on your birthday and anniversary. No marketing, promise.</p>
    </Card>
  );
}
