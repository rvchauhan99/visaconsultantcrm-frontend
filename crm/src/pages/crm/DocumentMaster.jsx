import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";

const inp = "w-full h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
const CATEGORIES = ["identity", "financial", "travel", "other"];

const emptyForm = {
    doc_key: "",
    default_name: "",
    default_description: "",
    default_formats_allowed: "pdf,jpg,png",
    default_max_file_size_mb: 5,
    default_required: true,
    vault_eligible: false,
    is_basic: false,
    category: "other",
    active: true,
};

export default function DocumentMaster() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);

    const load = () => api.get("/admin/document-master").then((r) => setRows(r.data));
    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!form.doc_key || !form.default_name) return toast.error("Key and name required");
        try {
            await api.post("/admin/document-master", {
                ...form,
                doc_key: form.doc_key.replace(/[^a-z0-9_]/g, "_"),
                default_formats_allowed: form.default_formats_allowed.split(",").map((s) => s.trim()).filter(Boolean),
            });
            toast.success("Document master created");
            setForm(emptyForm);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };

    const saveEdit = async () => {
        try {
            await api.patch(`/admin/document-master/${editing.id}`, {
                default_name: editing.default_name,
                default_description: editing.default_description,
                default_formats_allowed: Array.isArray(editing.default_formats_allowed)
                    ? editing.default_formats_allowed
                    : String(editing.default_formats_allowed).split(",").map((s) => s.trim()).filter(Boolean),
                default_max_file_size_mb: Number(editing.default_max_file_size_mb),
                default_required: editing.default_required,
                vault_eligible: editing.vault_eligible,
                is_basic: editing.is_basic,
                category: editing.category,
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
        <div className="p-6" data-testid="document-master-page">
            <h1 className="text-xl font-semibold mb-1">Document Master</h1>
            <p className="text-sm text-ink-muted mb-4">Controlled document types for product configuration. Keys cannot be renamed after create.</p>

            <div className="bg-surface-card border border-border rounded-sm overflow-hidden mb-6">
                <table className="w-full text-sm">
                    <thead className="bg-surface border-b border-border">
                        <tr>
                            {["Key", "Name", "Category", "Basic", "Vault", "Active", ""].map((h) => (
                                <th key={h} className="text-left px-3 py-2 text-xs font-mono uppercase tracking-widest text-ink-muted">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface/60">
                                <td className="px-3 py-2 font-mono text-xs">{r.doc_key}</td>
                                <td className="px-3 py-2">{r.default_name}</td>
                                <td className="px-3 py-2 font-mono text-xs">{r.category}</td>
                                <td className="px-3 py-2">{r.is_basic ? <Stamp tone="gold" size="sm">basic</Stamp> : "—"}</td>
                                <td className="px-3 py-2">{r.vault_eligible ? "yes" : "no"}</td>
                                <td className="px-3 py-2">{r.active ? "yes" : "no"}</td>
                                <td className="px-3 py-2 text-right">
                                    <button className="text-xs text-navy hover:underline" onClick={() => setEditing({
                                        ...r,
                                        default_formats_allowed: (r.default_formats_allowed || []).join(","),
                                    })} data-testid={`edit-doc-master-${r.doc_key}`}>Edit</button>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={7} className="px-3 py-6 text-ink-muted italic text-center">No document masters yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editing && (
                <div className="bg-surface-card border border-border rounded-sm p-4 mb-6 space-y-3" data-testid="edit-doc-master-form">
                    <div className="text-xs uppercase font-mono text-ink-muted">Edit · <span className="text-ink">{editing.doc_key}</span> (key locked)</div>
                    <div className="grid grid-cols-3 gap-2">
                        <input className={inp} value={editing.default_name} onChange={(e) => setEditing({ ...editing, default_name: e.target.value })} />
                        <input className={inp} value={editing.default_description || ""} onChange={(e) => setEditing({ ...editing, default_description: e.target.value })} placeholder="Description" />
                        <select className={inp} value={editing.category || "other"} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <input className={inp} value={editing.default_formats_allowed} onChange={(e) => setEditing({ ...editing, default_formats_allowed: e.target.value })} placeholder="pdf,jpg,png" />
                        <input className={inp} type="number" value={editing.default_max_file_size_mb} onChange={(e) => setEditing({ ...editing, default_max_file_size_mb: e.target.value })} />
                        <div className="flex flex-wrap gap-3 items-center text-xs">
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.default_required} onChange={(e) => setEditing({ ...editing, default_required: e.target.checked })} /> Required</label>
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.is_basic} onChange={(e) => setEditing({ ...editing, is_basic: e.target.checked })} /> Basic</label>
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.vault_eligible} onChange={(e) => setEditing({ ...editing, vault_eligible: e.target.checked })} /> Vault</label>
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="text-sm px-3 py-1.5 border border-border rounded-sm">Cancel</button>
                        <button onClick={saveEdit} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover">Save</button>
                    </div>
                </div>
            )}

            <div className="bg-surface-card border border-border rounded-sm p-4 space-y-3" data-testid="create-doc-master-form">
                <div className="text-xs uppercase font-mono text-ink-muted">Add document type</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <input className={inp} placeholder="doc_key" value={form.doc_key} onChange={(e) => setForm({ ...form, doc_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} data-testid="new-master-doc-key" />
                    <input className={inp} placeholder="Default name" value={form.default_name} onChange={(e) => setForm({ ...form, default_name: e.target.value })} data-testid="new-master-doc-name" />
                    <select className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input className={inp + " col-span-2"} placeholder="Description" value={form.default_description} onChange={(e) => setForm({ ...form, default_description: e.target.value })} />
                    <input className={inp} type="number" value={form.default_max_file_size_mb} onChange={(e) => setForm({ ...form, default_max_file_size_mb: Number(e.target.value) })} />
                    <input className={inp} placeholder="formats (pdf,jpg)" value={form.default_formats_allowed} onChange={(e) => setForm({ ...form, default_formats_allowed: e.target.value })} />
                    <div className="flex flex-wrap gap-3 items-center text-xs col-span-2">
                        <label className="flex items-center gap-1"><input type="checkbox" checked={form.default_required} onChange={(e) => setForm({ ...form, default_required: e.target.checked })} /> Required default</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_basic} onChange={(e) => setForm({ ...form, is_basic: e.target.checked })} data-testid="new-master-doc-basic" /> Basic (auto on new products)</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={form.vault_eligible} onChange={(e) => setForm({ ...form, vault_eligible: e.target.checked })} /> Vault eligible</label>
                    </div>
                </div>
                <button onClick={create} className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="create-doc-master-btn">Create document master</button>
            </div>
        </div>
    );
}
