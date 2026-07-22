import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Plus } from "lucide-react";

export default function Consultants() {
    const [list, setList] = useState([]);
    const [countries, setCountries] = useState([]);
    const [showNew, setShowNew] = useState(false);

    useEffect(() => {
        load();
        api.get("/visa-products/countries").then((r) => setCountries(r.data));
    }, []);
    const load = () => api.get("/admin/consultants").then((r) => setList(r.data));

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
            await api.patch(`/admin/consultants/${cid}/countries`, codes);
            toast.success("Countries updated");
            load();
        } catch (e) { toast.error("Failed"); }
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

            {showNew && <NewConsultantForm countries={countries} onCancel={() => setShowNew(false)} onCreate={create} />}

            <div className="bg-white border border-border rounded-sm">
                <table className="w-full text-sm">
                    <thead className="bg-surface border-b border-border">
                        <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-mono uppercase">Name</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Email</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Role</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Countries</th>
                            <th className="px-3 py-2 text-xs font-mono uppercase">Open</th>
                        </tr>
                    </thead>
                    <tbody data-testid="consultants-table">
                        {list.map((c) => (
                            <tr key={c.id} className="border-b border-border last:border-0">
                                <td className="px-3 py-2">{c.full_name}</td>
                                <td className="px-3 py-2 font-mono text-xs">{c.email}</td>
                                <td className="px-3 py-2"><Stamp tone={c.role === "admin" ? "gold" : "teal"} size="sm">{c.role}</Stamp></td>
                                <td className="px-3 py-2">
                                    <CountryPicker current={c.country_codes} all={countries} onSave={(codes) => updateCountries(c.id, codes)} testid={c.id} />
                                </td>
                                <td className="px-3 py-2 font-mono">{c.open_cases}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function NewConsultantForm({ countries, onCancel, onCreate }) {
    const [f, setF] = useState({ email: "", password: "", full_name: "", role: "consultant", country_codes: [] });
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); onCreate(f); }}
            className="bg-white border border-border rounded-sm p-4 mb-4 grid md:grid-cols-4 gap-3"
            data-testid="new-consultant-form"
        >
            <input className={inp} required placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} data-testid="nc-name" />
            <input className={inp} required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="nc-email" />
            <input className={inp} required minLength={6} type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="nc-password" />
            <select className={inp} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} data-testid="nc-role">
                <option value="consultant">consultant</option>
                <option value="admin">admin</option>
            </select>
            <div className="md:col-span-4 text-xs">
                <span className="text-ink-muted block mb-1">Assign countries:</span>
                <div className="flex flex-wrap gap-1.5">
                    {countries.map((c) => (
                        <label key={c.code} className={`px-2 py-0.5 border rounded-sm cursor-pointer ${f.country_codes.includes(c.code) ? "bg-navy text-white border-navy" : "border-border"}`}>
                            <input type="checkbox" checked={f.country_codes.includes(c.code)} onChange={(e) => setF({ ...f, country_codes: e.target.checked ? [...f.country_codes, c.code] : f.country_codes.filter((x) => x !== c.code) })} className="hidden" />
                            {c.flag} {c.name}
                        </label>
                    ))}
                </div>
            </div>
            <div className="md:col-span-4 flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="text-sm px-3 py-1.5 border border-border rounded-sm">Cancel</button>
                <button type="submit" className="text-sm px-3 py-1.5 bg-navy text-white rounded-sm hover:bg-navy-hover" data-testid="nc-submit">Create</button>
            </div>
        </form>
    );
}

function CountryPicker({ current, all, onSave, testid }) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(current);
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="text-xs font-mono border border-border px-2 py-0.5 rounded-sm hover:bg-surface" data-testid={`edit-countries-${testid}`}>
                {current.join(", ") || "none"} ✎
            </button>
            {open && (
                <div className="absolute z-30 top-full mt-1 bg-white border border-border rounded-sm p-2 w-80 shadow-card">
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto mb-2">
                        {all.map((c) => (
                            <label key={c.code} className={`text-[11px] px-1.5 py-0.5 border rounded-sm cursor-pointer ${selected.includes(c.code) ? "bg-navy text-white border-navy" : "border-border"}`}>
                                <input type="checkbox" checked={selected.includes(c.code)} onChange={(e) => setSelected(e.target.checked ? [...selected, c.code] : selected.filter((x) => x !== c.code))} className="hidden" />
                                {c.code}
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-1">
                        <button onClick={() => { setOpen(false); setSelected(current); }} className="text-xs px-2 py-0.5 border border-border rounded-sm">Cancel</button>
                        <button onClick={() => { onSave(selected); setOpen(false); }} className="text-xs px-2 py-0.5 bg-navy text-white rounded-sm">Save</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const inp = "h-8 px-2 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
