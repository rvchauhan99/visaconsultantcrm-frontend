import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Plus, UserX } from "lucide-react";
import { CountrySelect, ConsultantSelect } from "@/components/forms/selects";

export default function Consultants() {
    const [list, setList] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [reassignCtx, setReassignCtx] = useState(null); // { mode, cid, name, message, blocked, codes? }

    useEffect(() => { load(); }, []);
    const load = () => api.get("/admin/consultants").then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.items || []);
        setList(data);
    });

    const create = async (form) => {
        try {
            await api.post("/admin/consultants", form);
            toast.success("Consultant created");
            setShowNew(false);
            load();
        } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    };

    const updateCountries = async (cid, codes) => {
        try {
            const r = await api.patch(`/admin/consultants/${cid}/countries`, codes);
            if (r.data.requires_reassignment) {
                setReassignCtx({
                    mode: "countries",
                    cid,
                    codes,
                    message: r.data.message,
                    blocked: r.data.blocked_countries || [],
                });
                return;
            }
            toast.success("Countries updated");
            load();
        } catch (e) { toast.error("Failed"); }
    };

    const deactivate = async (cid, name) => {
        if (!window.confirm(`Deactivate ${name}?`)) return;
        try {
            const r = await api.patch(`/admin/consultants/${cid}/deactivate`);
            if (r.data.requires_reassignment) {
                setReassignCtx({
                    mode: "deactivate",
                    cid,
                    name,
                    message: r.data.message,
                    openCases: r.data.open_cases,
                });
                return;
            }
            toast.success("Consultant deactivated");
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };

    const confirmReassign = async (toId) => {
        if (!toId || !reassignCtx) return;
        const { mode, cid, codes, blocked } = reassignCtx;
        try {
            if (mode === "countries") {
                for (const b of blocked || []) {
                    await api.post(`/admin/consultants/${cid}/reassign-open`, {
                        to_consultant_id: toId,
                        country_code: b.country_code,
                    });
                }
                const r2 = await api.patch(`/admin/consultants/${cid}/countries`, codes);
                if (r2.data.ok === false) {
                    toast.error(r2.data.message || "Still blocked");
                    return;
                }
                toast.success("Reassigned and countries updated");
            } else {
                await api.post(`/admin/consultants/${cid}/reassign-open`, { to_consultant_id: toId });
                const r2 = await api.patch(`/admin/consultants/${cid}/deactivate`);
                if (!r2.data.ok) {
                    toast.error(r2.data.message || "Still has open cases");
                    return;
                }
                toast.success("Reassigned and deactivated");
            }
            setReassignCtx(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Reassignment failed");
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Admin</div>
                    <h1 className="text-xl font-semibold">Consultants</h1>
                </div>
                <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 bg-navy text-white text-sm px-3 py-1.5 rounded-sm hover:bg-navy-hover" data-testid="new-consultant-btn">
                    <Plus className="w-4 h-4" /> New consultant
                </button>
            </div>

            {showNew && <NewConsultantForm onCancel={() => setShowNew(false)} onCreate={create} />}

            {reassignCtx && (
                <div className="bg-warning/10 border border-warning rounded-sm p-4 mb-4" data-testid="reassign-panel">
                    <div className="text-sm font-medium mb-1">Reassignment required</div>
                    <p className="text-xs text-ink-muted mb-3">{reassignCtx.message}</p>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-64">
                            <label className="text-[10px] uppercase font-mono text-ink-muted block mb-1">Target consultant</label>
                            <ConsultantSelect
                                admin
                                value={null}
                                excludeId={reassignCtx.cid}
                                onChange={confirmReassign}
                                placeholder="Search consultant…"
                                testId="reassign-target"
                                clearable={false}
                            />
                        </div>
                        <button type="button" onClick={() => setReassignCtx(null)} className="text-xs px-3 py-1.5 border border-border rounded-sm">Cancel</button>
                    </div>
                </div>
            )}

            <div className="bg-surface-card border border-border rounded-sm">
                <table className="w-full text-sm">
                    <thead className="bg-surface border-b border-border">
                        <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-mono uppercase">Name</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Email</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Role</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Countries</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Open</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Status</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody data-testid="consultants-table">
                        {list.map((c) => (
                            <tr key={c.id} className="border-b border-border last:border-0">
                                <td className="px-3 py-2">{c.full_name}</td>
                                <td className="px-3 py-2 font-mono text-xs">{c.email}</td>
                                <td className="px-3 py-2"><Stamp tone={c.role === "admin" ? "gold" : "teal"} size="sm">{c.role}</Stamp></td>
                                <td className="px-3 py-2 min-w-[200px]">
                                    <CountryPicker
                                        current={c.country_codes || []}
                                        onSave={(codes) => updateCountries(c.id, codes)}
                                        testid={c.id}
                                    />
                                </td>
                                <td className="px-3 py-2 font-mono">{c.open_cases}</td>
                                <td className="px-3 py-2"><Stamp tone={c.active ? "success" : "muted"} size="sm">{c.active ? "active" : "inactive"}</Stamp></td>
                                <td className="px-3 py-2 text-right">
                                    {c.active && (
                                        <button
                                            onClick={() => deactivate(c.id, c.full_name)}
                                            className="text-xs text-ink-muted hover:text-danger inline-flex items-center gap-1"
                                            data-testid={`deactivate-${c.id}`}
                                        >
                                            <UserX className="w-3 h-3" /> Deactivate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function NewConsultantForm({ onCancel, onCreate }) {
    const [f, setF] = useState({ email: "", password: "", full_name: "", role: "consultant", country_codes: [] });
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); onCreate(f); }}
            className="bg-surface-card border border-border rounded-sm p-4 mb-4 grid md:grid-cols-4 gap-3"
            data-testid="new-consultant-form"
        >
            <input className={inp} required placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} data-testid="nc-name" />
            <input className={inp} required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="nc-email" />
            <input className={inp} required minLength={6} type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="nc-password" />
            <select className={inp} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} data-testid="nc-role">
                <option value="consultant">consultant</option>
                <option value="admin">admin</option>
            </select>
            <div className="md:col-span-4">
                <span className="text-ink-muted text-xs block mb-1">Assign countries:</span>
                <CountrySelect
                    multiple
                    value={f.country_codes}
                    onChange={(codes) => setF({ ...f, country_codes: codes || [] })}
                    placeholder="Search & select countries…"
                    testId="nc-countries"
                />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="text-sm px-3 py-1.5 border border-border rounded-sm">Cancel</button>
                <button type="submit" className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="nc-submit">Create</button>
            </div>
        </form>
    );
}

function CountryPicker({ current, onSave, testid }) {
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState(current);

    useEffect(() => { setSelected(current); }, [current]);

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="text-xs font-mono border border-border px-2 py-0.5 rounded-sm hover:bg-surface text-left"
                data-testid={`edit-countries-${testid}`}
            >
                {(current || []).join(", ") || "none"} ✎
            </button>
        );
    }

    return (
        <div className="space-y-2" data-testid={`country-picker-${testid}`}>
            <CountrySelect
                multiple
                value={selected}
                onChange={(codes) => setSelected(codes || [])}
                placeholder="Search countries…"
                testId={`edit-countries-select-${testid}`}
            />
            <div className="flex gap-1">
                <button
                    type="button"
                    onClick={() => { setSelected(current); setEditing(false); }}
                    className="text-xs px-2 py-0.5 border border-border rounded-sm"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => { onSave(selected); setEditing(false); }}
                    className="text-xs px-2 py-0.5 bg-navy text-white rounded-sm"
                >
                    Save
                </button>
            </div>
        </div>
    );
}

const inp = "h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
