import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { saveSession } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function CrmLogin() {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const r = await api.post("/auth/staff/login", { email, password });
            saveSession(r.data.access_token, r.data.user);
            toast.success("Signed in");
            nav("/crm");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Authentication failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6">
            <form onSubmit={submit} className="w-full max-w-sm bg-white border border-border rounded-md p-8" data-testid="crm-login-form">
                <div className="mb-6">
                    <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">Staff sign-in</div>
                    <h1 className="text-xl font-semibold">Passage CRM</h1>
                </div>
                <div className="space-y-4">
                    <label className="block">
                        <span className="text-xs text-ink-muted mb-1 block">Email</span>
                        <input type="email" required className={inp} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="crm-login-email" />
                    </label>
                    <label className="block">
                        <span className="text-xs text-ink-muted mb-1 block">Password</span>
                        <input type="password" required className={inp} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="crm-login-password" />
                    </label>
                    <button type="submit" disabled={busy} className="w-full py-2.5 bg-navy text-white rounded-sm text-sm hover:bg-navy-hover disabled:opacity-50 flex items-center justify-center gap-2" data-testid="crm-login-submit">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
                    </button>
                </div>
                <div className="mt-6 pt-4 border-t border-border text-[11px] font-mono text-ink-muted space-y-1">
                    <div>admin@visaconsult.demo / Admin@123</div>
                    <div>priya.consultant@visaconsult.demo / Consult@123</div>
                </div>
            </form>
        </div>
    );
}
const inp = "w-full h-9 px-3 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";
