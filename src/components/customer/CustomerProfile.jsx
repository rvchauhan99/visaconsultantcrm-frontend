import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Pencil, Cake, Heart, Save, X } from "lucide-react";

/**
 * Customer profile — DOB + anniversary for wishes.
 * Placed on the Account page.
 */
export default function CustomerProfile() {
    const [me, setMe] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [busy, setBusy] = useState(false);

    const load = () => api.get("/customers/me").then((r) => { setMe(r.data); setForm(r.data); });
    useEffect(() => { load(); }, []);

    if (!me) return null;

    const save = async () => {
        setBusy(true);
        try {
            await api.patch("/customers/me", {
                full_name: form.full_name,
                phone: form.phone,
                dob: form.dob || null,
                anniversary_date: form.anniversary_date || null,
            });
            toast.success("Profile saved");
            setEditing(false);
            load();
        } catch (e) { toast.error("Failed"); }
        finally { setBusy(false); }
    };

    const nice = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long" }) : "—";

    return (
        <div className="bg-white border border-border rounded-xl p-5 md:p-6" data-testid="customer-profile">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Your profile</h2>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1.5" data-testid="edit-profile-btn">
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
                    <dt className="text-ink-muted inline-flex items-center gap-1.5"><Cake className="w-4 h-4" /> Birthday</dt>
                    <dd data-testid="profile-dob">{nice(me.dob)}</dd>
                    <dt className="text-ink-muted inline-flex items-center gap-1.5"><Heart className="w-4 h-4" /> Anniversary</dt>
                    <dd data-testid="profile-anniversary">{nice(me.anniversary_date)}</dd>
                </dl>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <F label="Full name"><input className={inp} value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="profile-name-input" /></F>
                    <F label="Phone"><input className={inp} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="profile-phone-input" /></F>
                    <F label="Birthday"><input type="date" className={inp} value={form.dob || ""} onChange={(e) => setForm({ ...form, dob: e.target.value })} data-testid="profile-dob-input" /></F>
                    <F label="Anniversary"><input type="date" className={inp} value={form.anniversary_date || ""} onChange={(e) => setForm({ ...form, anniversary_date: e.target.value })} data-testid="profile-anniversary-input" /></F>
                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                        <button onClick={() => { setEditing(false); setForm(me); }} className="text-sm px-4 py-2 rounded-full border border-border text-ink-muted hover:text-ink inline-flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                        <button onClick={save} disabled={busy} className="text-sm px-4 py-2 rounded-full bg-navy text-white hover:bg-navy-hover disabled:opacity-50 inline-flex items-center gap-1" data-testid="profile-save"><Save className="w-4 h-4" /> Save</button>
                    </div>
                </div>
            )}
            <p className="text-xs text-ink-muted mt-4">We'll send you a small message on your birthday and anniversary. No marketing, promise.</p>
        </div>
    );
}
const inp = "w-full h-10 px-3 border border-border rounded-md bg-white text-sm text-ink outline-none focus:ring-2 focus:ring-navy focus:border-navy";
function F({ label, children }) {
    return <label className="block"><span className="text-xs text-ink-muted mb-1.5 block">{label}</span>{children}</label>;
}
