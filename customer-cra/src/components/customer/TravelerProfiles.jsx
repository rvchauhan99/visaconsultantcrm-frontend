import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Plus, Trash2, Pencil, User, Users, X } from "lucide-react";

const RELATIONSHIPS = ["self", "spouse", "child", "parent", "other"];

/**
 * Saved traveler profiles — self + family members.
 * Passport numbers stored encrypted; list shows masked (P1••••67).
 * The prefill fetch (GET /:id) returns unmasked for the Apply flow.
 */
export default function TravelerProfiles() {
    const [list, setList] = useState([]);
    const [editing, setEditing] = useState(null); // null | 'new' | id
    const [busy, setBusy] = useState(false);

    const load = () => api.get("/customers/me/traveler-profiles").then((r) => setList(r.data));
    useEffect(() => { load(); }, []);

    const save = async (form, id) => {
        setBusy(true);
        try {
            if (id === "new") await api.post("/customers/me/traveler-profiles", form);
            else await api.patch(`/customers/me/traveler-profiles/${id}`, form);
            toast.success("Saved");
            setEditing(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        } finally { setBusy(false); }
    };

    const remove = async (id) => {
        if (!window.confirm("Remove this traveler?")) return;
        await api.delete(`/customers/me/traveler-profiles/${id}`);
        toast.success("Removed");
        load();
    };

    return (
        <div className="bg-white border border-border rounded-xl p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-navy" />
                    <h2 className="text-lg font-medium">Saved travelers</h2>
                </div>
                <button onClick={() => setEditing("new")} data-testid="add-traveler-btn" className="text-sm inline-flex items-center gap-1.5 border border-ink px-3 py-1.5 rounded-full hover:bg-ink hover:text-white transition-colors">
                    <Plus className="w-4 h-4" /> Add traveler
                </button>
            </div>

            {editing && (
                <TravelerEditor
                    profile={editing === "new" ? null : list.find((p) => p.id === editing)}
                    onCancel={() => setEditing(null)}
                    onSave={(form) => save(form, editing)}
                    busy={busy}
                />
            )}

            {list.length === 0 && !editing ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl bg-surface">
                    <Stamp tone="gold" size="sm" className="mx-auto mb-3">No travelers yet</Stamp>
                    <p className="text-sm text-ink-muted mb-4">Add yourself, or a family member, to speed up your next application.</p>
                    <button onClick={() => setEditing("new")} className="text-sm bg-navy text-white px-4 py-2 rounded-full hover:bg-navy-hover">
                        Add your first traveler
                    </button>
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
                                    <div className="font-medium text-sm">{p.full_name} <span className="ml-1 text-[10px] uppercase font-mono tracking-widest text-ink-muted">{p.relationship}</span></div>
                                    <div className="text-xs text-ink-muted font-mono">Passport {p.passport_number_masked || "—"} · exp {p.passport_expiry_date || "—"}</div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setEditing(p.id)} className="p-1.5 text-ink-muted hover:text-ink" data-testid={`edit-traveler-${p.id.slice(0, 6)}`}><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => remove(p.id)} className="p-1.5 text-ink-muted hover:text-danger" data-testid={`delete-traveler-${p.id.slice(0, 6)}`}><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function TravelerEditor({ profile, onCancel, onSave, busy }) {
    const [form, setForm] = useState({
        full_name: profile?.full_name || "",
        relationship: profile?.relationship || "self",
        dob: profile?.dob || "",
        passport_number: "",  // never prefilled from a masked value
        passport_expiry_date: profile?.passport_expiry_date || "",
        gender: profile?.gender || "",
        phone: profile?.phone || "",
        email: profile?.email || "",
    });
    const submit = (e) => {
        e.preventDefault();
        onSave(form);
    };
    return (
        <form onSubmit={submit} className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-3" data-testid="traveler-editor">
            <div className="flex items-center justify-between">
                <div className="text-xs uppercase font-mono tracking-widest text-ink-muted">{profile ? "Edit traveler" : "New traveler"}</div>
                <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <F label="Full name (as on passport)"><input required className={inp} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="tp-name" /></F>
                <F label="Relationship"><select className={inp} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} data-testid="tp-relationship">{RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}</select></F>
                <F label="Date of birth"><input type="date" className={inp} value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} data-testid="tp-dob" /></F>
                <F label="Gender"><select className={inp} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></F>
                <F label={profile ? "Passport number (leave blank to keep existing)" : "Passport number"}><input className={inp} value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value.toUpperCase() })} data-testid="tp-passport" /></F>
                <F label="Passport expiry"><input type="date" className={inp} value={form.passport_expiry_date} onChange={(e) => setForm({ ...form, passport_expiry_date: e.target.value })} data-testid="tp-expiry" /></F>
                <F label="Phone"><input type="tel" className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
                <F label="Email"><input type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="text-sm px-4 py-2 rounded-full border border-border text-ink-muted hover:text-ink">Cancel</button>
                <button type="submit" disabled={busy} className="text-sm px-4 py-2 rounded-full bg-navy text-white hover:bg-navy-hover disabled:opacity-50" data-testid="tp-save">Save traveler</button>
            </div>
        </form>
    );
}

const inp = "w-full h-10 px-3 border border-border rounded-md bg-white text-sm text-ink outline-none focus:ring-2 focus:ring-navy focus:border-navy";
function F({ label, children }) {
    return (
        <label className="block">
            <span className="text-xs text-ink-muted mb-1.5 block">{label}</span>
            {children}
        </label>
    );
}
