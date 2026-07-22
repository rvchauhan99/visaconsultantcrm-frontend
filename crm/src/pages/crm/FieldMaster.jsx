import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";

const inp = "w-full h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
const TYPES = ["text", "date", "dropdown", "number"];

const emptyForm = {
    field_key: "",
    default_label: "",
    default_field_type: "text",
    default_options: "",
    default_required: true,
    is_basic: false,
    active: true,
};

export default function FieldMaster() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);

    const load = () => api.get("/admin/field-master").then((r) => setRows(r.data));
    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!form.field_key || !form.default_label) return toast.error("Key and label required");
        const body = {
            field_key: form.field_key.replace(/[^a-z0-9_]/g, "_"),
            default_label: form.default_label,
            default_field_type: form.default_field_type,
            default_required: form.default_required,
            is_basic: form.is_basic,
            active: form.active,
            default_options: form.default_field_type === "dropdown"
                ? form.default_options.split(",").map((s) => s.trim()).filter(Boolean)
                : null,
        };
        try {
            await api.post("/admin/field-master", body);
            toast.success("Field master created");
            setForm(emptyForm);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };

    const saveEdit = async () => {
        try {
            await api.patch(`/admin/field-master/${editing.id}`, {
                default_label: editing.default_label,
                default_field_type: editing.default_field_type,
                default_options: editing.default_field_type === "dropdown"
                    ? (Array.isArray(editing.default_options)
                        ? editing.default_options
                        : String(editing.default_options || "").split(",").map((s) => s.trim()).filter(Boolean))
                    : null,
                default_required: editing.default_required,
                is_basic: editing.is_basic,
                active: editing.active,
            });
            toast.success("Updated");
            setEditing(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };

    return (
        <div className="p-6" data-testid="field-master-page">
            <h1 className="text-xl font-semibold mb-1">Field Master</h1>
            <p className="text-sm text-ink-muted mb-4">Controlled application fields. Basics auto-attach when creating a new visa product.</p>

            <div className="bg-white border border-border rounded-sm overflow-hidden mb-6">
                <table className="w-full text-sm">
                    <thead className="bg-surface border-b border-border">
                        <tr>
                            {["Key", "Label", "Type", "Basic", "Active", ""].map((h) => (
                                <th key={h} className="text-left px-3 py-2 text-xs font-mono uppercase tracking-widest text-ink-muted">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface/60">
                                <td className="px-3 py-2 font-mono text-xs">{r.field_key}</td>
                                <td className="px-3 py-2">{r.default_label}</td>
                                <td className="px-3 py-2 font-mono text-xs">{r.default_field_type}</td>
                                <td className="px-3 py-2">{r.is_basic ? <Stamp tone="gold" size="sm">basic</Stamp> : "—"}</td>
                                <td className="px-3 py-2">{r.active ? "yes" : "no"}</td>
                                <td className="px-3 py-2 text-right">
                                    <button className="text-xs text-navy hover:underline" onClick={() => setEditing({
                                        ...r,
                                        default_options: (r.default_options || []).join(","),
                                    })} data-testid={`edit-field-master-${r.field_key}`}>Edit</button>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={6} className="px-3 py-6 text-ink-muted italic text-center">No field masters yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editing && (
                <div className="bg-white border border-border rounded-sm p-4 mb-6 space-y-3" data-testid="edit-field-master-form">
                    <div className="text-xs uppercase font-mono text-ink-muted">Edit · <span className="text-ink">{editing.field_key}</span> (key locked)</div>
                    <div className="grid grid-cols-3 gap-2">
                        <input className={inp} value={editing.default_label} onChange={(e) => setEditing({ ...editing, default_label: e.target.value })} />
                        <select className={inp} value={editing.default_field_type} onChange={(e) => setEditing({ ...editing, default_field_type: e.target.value })}>
                            {TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        {editing.default_field_type === "dropdown" && (
                            <input className={inp} value={editing.default_options || ""} onChange={(e) => setEditing({ ...editing, default_options: e.target.value })} placeholder="options,comma,separated" />
                        )}
                        <div className="flex flex-wrap gap-3 items-center text-xs">
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.default_required} onChange={(e) => setEditing({ ...editing, default_required: e.target.checked })} /> Required</label>
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.is_basic} onChange={(e) => setEditing({ ...editing, is_basic: e.target.checked })} /> Basic</label>
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="text-sm px-3 py-1.5 border border-border rounded-sm">Cancel</button>
                        <button onClick={saveEdit} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover">Save</button>
                    </div>
                </div>
            )}

            <div className="bg-white border border-border rounded-sm p-4 space-y-3" data-testid="create-field-master-form">
                <div className="text-xs uppercase font-mono text-ink-muted">Add field type</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <input className={inp} placeholder="field_key" value={form.field_key} onChange={(e) => setForm({ ...form, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} data-testid="new-master-field-key" />
                    <input className={inp} placeholder="Default label" value={form.default_label} onChange={(e) => setForm({ ...form, default_label: e.target.value })} data-testid="new-master-field-label" />
                    <select className={inp} value={form.default_field_type} onChange={(e) => setForm({ ...form, default_field_type: e.target.value })}>
                        {TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {form.default_field_type === "dropdown" && (
                        <input className={inp + " col-span-2"} placeholder="Options (comma separated)" value={form.default_options} onChange={(e) => setForm({ ...form, default_options: e.target.value })} />
                    )}
                    <div className="flex flex-wrap gap-3 items-center text-xs col-span-2">
                        <label className="flex items-center gap-1"><input type="checkbox" checked={form.default_required} onChange={(e) => setForm({ ...form, default_required: e.target.checked })} /> Required default</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_basic} onChange={(e) => setForm({ ...form, is_basic: e.target.checked })} data-testid="new-master-field-basic" /> Basic (auto on new products)</label>
                    </div>
                </div>
                <button onClick={create} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="create-field-master-btn">Create field master</button>
            </div>
        </div>
    );
}
