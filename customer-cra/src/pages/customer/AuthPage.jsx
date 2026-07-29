import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { saveSession } from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
    const nav = useNavigate();
    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const endpoint = mode === "login" ? "/auth/customer/login" : "/auth/customer/register";
            const body = mode === "login" ? { email, password } : { email, password, full_name: name, phone };
            const r = await api.post(endpoint, body);
            saveSession(r.data.access_token, r.data.user);
            toast.success(mode === "login" ? "Welcome back" : "Account created");
            const next = sessionStorage.getItem("vc_next");
            sessionStorage.removeItem("vc_next");
            nav(next || "/account");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Authentication failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-6 py-16">
            <div className="text-center mb-8">
                <Stamp tone="gold" size="md" className="mx-auto mb-4">AmaraVisa</Stamp>
                <h1 className="font-display text-3xl text-navy">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
                <p className="text-sm text-ink-muted mt-2">For Indian passport holders applying for a visa.</p>
            </div>

            <form onSubmit={submit} className="bg-white border border-border rounded-xl p-6 md:p-8 space-y-5">
                {mode === "signup" && (
                    <>
                        <Field label="Full name (as on passport)"><input required className={inp} value={name} onChange={(e) => setName(e.target.value)} data-testid="auth-name" /></Field>
                        <Field label="Phone"><input type="tel" className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="auth-phone" /></Field>
                    </>
                )}
                <Field label="Email"><input type="email" required className={inp} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="auth-email" /></Field>
                <Field label="Password"><input type="password" required minLength={6} className={inp} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="auth-password" /></Field>

                <button type="submit" disabled={busy} className="w-full py-3 rounded-full bg-navy text-white hover:bg-navy-hover disabled:opacity-50 flex items-center justify-center gap-2" data-testid="auth-submit">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {mode === "login" ? "Sign in" : "Create account"}
                </button>
            </form>

            <p className="text-center text-sm text-ink-muted mt-6">
                {mode === "login" ? "New here? " : "Have an account? "}
                <button
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="text-teal underline"
                    data-testid="auth-toggle"
                >{mode === "login" ? "Create an account" : "Sign in"}</button>
            </p>
        </div>
    );
}

const inp = "w-full h-10 px-3 border border-border rounded-md bg-white text-sm text-ink outline-none focus:ring-2 focus:ring-navy focus:border-navy";
function Field({ label, children }) {
    return (
        <label className="block">
            <span className="text-xs text-ink-muted mb-1.5 block">{label}</span>
            {children}
        </label>
    );
}
