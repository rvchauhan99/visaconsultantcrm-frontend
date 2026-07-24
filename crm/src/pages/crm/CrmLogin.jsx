import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { saveSession } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const inp = "w-full h-9 px-3 border border-border rounded-sm bg-surface-elevated text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";

export default function CrmLogin() {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [otp, setOtp] = useState("");

    const finishLogin = (data) => {
        saveSession(data.access_token, data.user);
        toast.success("Signed in");
        nav("/");
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const r = await api.post("/auth/staff/login", { email, password });
            if (r.data.require_2fa) {
                setTempToken(r.data.temp_token);
                setOtp("");
                toast.message("Enter your authenticator code");
                return;
            }
            finishLogin(r.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Authentication failed");
        } finally {
            setBusy(false);
        }
    };

    const verify2fa = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.error("Enter the 6-digit code");
            return;
        }
        setBusy(true);
        try {
            const r = await api.post("/auth/staff/verify-2fa", {
                temp_token: tempToken,
                code: otp,
            });
            finishLogin(r.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Invalid authentication code");
        } finally {
            setBusy(false);
        }
    };

    const backToPassword = () => {
        setTempToken("");
        setOtp("");
        setPassword("");
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6">
            {!tempToken ? (
                <form onSubmit={submit} className="w-full max-w-sm bg-surface-card border border-border rounded-sm p-8 shadow-[var(--shadow-card)]" data-testid="crm-login-form">
                    <div className="mb-6">
                        <div className="inline-flex w-9 h-9 items-center justify-center rounded-sm border-2 border-double border-navy text-navy text-[10px] font-mono font-semibold mb-3">PC</div>
                        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">Staff sign-in</div>
                        <h1 className="text-xl font-semibold text-navy">Passage CRM</h1>
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
            ) : (
                <form onSubmit={verify2fa} className="w-full max-w-sm bg-surface-card border border-border rounded-sm p-8 shadow-[var(--shadow-card)]" data-testid="crm-login-2fa-form">
                    <div className="mb-6">
                        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">Two-factor auth</div>
                        <h1 className="text-xl font-semibold text-navy">Enter authenticator code</h1>
                        <p className="text-xs text-ink-muted mt-2">
                            Open your authenticator app and enter the 6-digit code for this account.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="crm-login-otp">
                                <InputOTPGroup>
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <InputOTPSlot key={i} index={i} />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                        <button
                            type="submit"
                            disabled={busy || otp.length !== 6}
                            className="w-full py-2.5 bg-navy text-white rounded-sm text-sm hover:bg-navy-hover disabled:opacity-50 flex items-center justify-center gap-2"
                            data-testid="crm-login-2fa-submit"
                        >
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Verify &amp; sign in
                        </button>
                        <button
                            type="button"
                            onClick={backToPassword}
                            className="w-full text-xs text-ink-muted hover:text-ink"
                            data-testid="crm-login-2fa-back"
                        >
                            Back to password
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
