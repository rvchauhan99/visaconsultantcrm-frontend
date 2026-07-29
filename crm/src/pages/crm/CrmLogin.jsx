import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { saveSession } from "@/lib/api";
import { Loader2, Mail, Lock, ShieldCheck, Clock, BarChart3 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: <ShieldCheck className="w-4 h-4" />, text: "End-to-end encrypted document storage" },
  { icon: <Clock className="w-4 h-4" />, text: "Real-time SLA tracking and escalation alerts" },
  { icon: <BarChart3 className="w-4 h-4" />, text: "Pipeline analytics and consultant workload" },
];

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
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setBusy(true);
    try {
      const r = await api.post("/auth/staff/verify-2fa", { temp_token: tempToken, code: otp });
      finishLogin(r.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid authentication code");
    } finally {
      setBusy(false);
    }
  };

  const backToPassword = () => { setTempToken(""); setOtp(""); setPassword(""); };

  /* 2FA is a separate centered card, not split */
  if (tempToken) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6" style={{ background: "var(--surface)" }}>
        <form
          onSubmit={verify2fa}
          className="w-full max-w-sm bg-surface-card border border-border rounded-[12px] p-8 shadow-[var(--shadow-lift)]"
          data-testid="crm-login-2fa-form"
        >
          <div className="mb-6 text-center">
            <div className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-navy/10 border border-navy/20 text-navy mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">Two-factor auth</div>
            <h1 className="text-lg font-semibold text-ink">Enter authenticator code</h1>
            <p className="text-xs text-ink-muted mt-1.5">Open your authenticator app and enter the 6-digit code.</p>
          </div>
          <div className="space-y-5">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="crm-login-otp">
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="w-full py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-navy-hover disabled:opacity-40 flex items-center justify-center gap-2"
              data-testid="crm-login-2fa-submit"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify &amp; sign in
            </button>
            <button type="button" onClick={backToPassword} className="w-full text-xs text-ink-muted hover:text-ink" data-testid="crm-login-2fa-back">
              ← Back to password
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* Main split-screen login */
  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ background: "var(--surface)" }}>

      {/* ── Left: Brand panel ── */}
      <div className="hidden md:flex flex-col relative overflow-hidden" style={{ background: "var(--navy-deep, #0f2820)" }}>
        {/* Background overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_20%_40%,rgba(47,107,90,0.45),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_85%_80%,rgba(176,141,87,0.1),transparent_60%)]" />
        {/* Grain */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "180px",
          }}
        />

        <div className="relative flex flex-col h-full p-10 lg:p-12">
          {/* Logo */}
          <div className="mb-16">
            <AmaraVisaLogo size="md" invert className="opacity-95" />
            <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-[rgba(255,252,247,0.35)]">
              AmaraVisa CRM · Ops desk
            </div>
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="font-sans text-3xl lg:text-4xl font-semibold text-[rgba(255,252,247,0.94)] leading-[1.15] tracking-tight mb-5">
              Efficient visa<br />operations for<br />your team.
            </h2>
            <p className="text-sm text-[rgba(255,252,247,0.5)] leading-relaxed max-w-xs mb-10">
              Manage applications, documents, and consultant workloads from a single desk.
            </p>
            <div className="space-y-4">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-[rgba(255,252,247,0.55)]">
                  <span className="w-7 h-7 rounded-md bg-[rgba(255,252,247,0.05)] border border-[rgba(255,252,247,0.08)] flex items-center justify-center text-[rgba(176,141,87,0.7)] shrink-0">
                    {f.icon}
                  </span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[rgba(255,252,247,0.2)] font-mono">© AmaraVisa · Staff access only</div>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="flex flex-col items-center justify-center px-6 sm:px-10 md:px-14 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="md:hidden mb-8">
            <AmaraVisaLogo size="md" className="mb-1" />
            <div className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">AmaraVisa CRM · Ops desk</div>
          </div>

          <div className="mb-7">
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2">Staff sign-in</div>
            <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
            <p className="text-xs text-ink-muted mt-1">Sign in with your staff credentials.</p>
          </div>

          <form onSubmit={submit} className="space-y-4" data-testid="crm-login-form">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-muted block">Email</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@amaravisa.com"
                  className="crm-input pl-8 w-full"
                  data-testid="crm-login-email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-muted block">Password</label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="crm-input pl-8 w-full"
                  data-testid="crm-login-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-navy-hover disabled:opacity-40 flex items-center justify-center gap-2 shadow-[var(--shadow-card)] hover:shadow-glow-navy transition-all"
              data-testid="crm-login-submit"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-[11px] font-mono text-ink-muted space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted/60 mb-2">Dev credentials</div>
            <div>admin@visaconsult.demo / Admin@123</div>
            <div>priya.consultant@visaconsult.demo / Consult@123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
