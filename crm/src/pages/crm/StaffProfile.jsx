import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Shield, ShieldOff, User, Smartphone } from "lucide-react";
import api, { clearSession, getUser, saveSession, getToken } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Stamp from "@/components/Stamp";
import { PageHeader, SectionLabel } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmCard, CrmEmptyState } from "@/components/ui/crm-card";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { CountrySelect } from "@/components/forms/selects";

export default function StaffProfile() {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get("/staff/me");
      setProfile(r.data);
      const token = getToken();
      const sessionUser = getUser() || {};
      if (token) {
        saveSession(token, {
          ...sessionUser,
          id: r.data.id,
          email: r.data.email,
          full_name: r.data.full_name,
          role: r.data.role,
          country_codes: r.data.country_codes || [],
          two_factor_enabled: !!r.data.two_factor_enabled,
        });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <div className="h-32 rounded-[10px] bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted animate-[shimmer_1.6s_linear_infinite] bg-[length:200%_100%]" />
        <div className="h-64 rounded-[10px] bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted animate-[shimmer_1.6s_linear_infinite] bg-[length:200%_100%]" />
      </div>
    );
  }
  if (!profile) return <CrmEmptyState title="Profile unavailable" />;

  const initial = (profile.full_name || profile.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="p-6 max-w-5xl space-y-6" data-testid="staff-profile-page">
      <PageHeader label="Account" title="User profile" />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Profile sidebar */}
        <CrmCard className="p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-surface-muted border border-border flex items-center justify-center text-2xl font-bold text-ink-muted mb-4 shadow-sm">
            {initial}
          </div>
          <h2 className="text-base font-semibold text-ink leading-tight">{profile.full_name}</h2>
          <p className="text-xs font-mono text-ink-muted mt-1 mb-4">{profile.email}</p>
          <Stamp tone={profile.role === "admin" ? "gold" : "ink"} size="sm">{profile.role}</Stamp>
          <div className="mt-6 pt-6 border-t border-border">
            <CrmButton variant="outline" className="w-full" onClick={() => { clearSession(); nav("/login"); }} data-testid="logout-btn">
              Sign out
            </CrmButton>
          </div>
        </CrmCard>

        {/* Settings tabs */}
        <Tabs defaultValue="security">
          <TabsList className="bg-surface-card border border-border rounded-[10px] h-auto p-1 flex gap-0.5 w-max mb-4">
            <TabsTrigger value="security" className="text-[11px] uppercase font-mono tracking-wider px-3 py-1.5 rounded-md data-[state=active]:bg-navy data-[state=active]:text-white data-[state=inactive]:text-ink-muted data-[state=inactive]:hover:text-ink">Security & 2FA</TabsTrigger>
            <TabsTrigger value="countries" className="text-[11px] uppercase font-mono tracking-wider px-3 py-1.5 rounded-md data-[state=active]:bg-navy data-[state=active]:text-white data-[state=inactive]:text-ink-muted data-[state=inactive]:hover:text-ink">Countries</TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="m-0">
            <CrmCard className="p-6">
              <SectionLabel>Two-factor authentication</SectionLabel>
              <TwoFactorSection profile={profile} onUpdate={load} />
            </CrmCard>
            <CrmCard className="p-6 mt-4">
              <SectionLabel>Change password</SectionLabel>
              <PasswordChangeSection />
            </CrmCard>
          </TabsContent>

          <TabsContent value="countries" className="m-0">
            <CrmCard className="p-6">
              <SectionLabel>Managed countries</SectionLabel>
              <p className="text-sm text-ink-muted mb-4">
                {profile.role === "admin" ? "As an admin, you have access to all countries automatically." : "You can only view and manage cases for the countries assigned below."}
              </p>
              {profile.role === "admin" ? (
                <Stamp tone="gold" size="sm">All countries (Admin)</Stamp>
              ) : profile.country_codes?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.country_codes.map((c) => <Stamp key={c} tone="navy" size="sm">{c}</Stamp>)}
                </div>
              ) : (
                <div className="text-sm italic text-ink-muted">No countries assigned. Contact an admin.</div>
              )}
            </CrmCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PasswordChangeSection() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch("/staff/me/password", { current_password: current, new_password: newPass });
      toast.success("Password updated");
      setCurrent(""); setNewPass("");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4 max-w-lg" data-testid="password-form">
      <CrmField label="Current password" required>
        <CrmInput type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} data-testid="pwd-current" />
      </CrmField>
      <CrmField label="New password" required>
        <CrmInput type="password" required value={newPass} onChange={(e) => setNewPass(e.target.value)} data-testid="pwd-new" />
      </CrmField>
      <div className="sm:col-span-2">
        <CrmButton type="submit" variant="solid" size="sm" disabled={!current || !newPass} loading={busy} data-testid="pwd-submit">
          Update password
        </CrmButton>
      </div>
    </form>
  );
}

function TwoFactorSection({ profile, onUpdate }) {
  const [setup, setSetup] = useState(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const enabled = !!profile.two_factor_enabled;

  const toggle = async () => {
    if (enabled) {
      if (!window.confirm("Are you sure you want to disable 2FA? This is not recommended.")) return;
      setBusy(true);
      try {
        await api.delete("/auth/staff/2fa");
        toast.success("2FA disabled"); onUpdate();
      } catch (e) { toast.error("Failed"); } finally { setBusy(false); }
    } else {
      setBusy(true);
      try {
        const r = await api.post("/auth/staff/2fa/setup");
        setSetup(r.data); setOtp("");
      } catch (e) { toast.error("Failed"); } finally { setBusy(false); }
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter 6 digits");
    setBusy(true);
    try {
      await api.post("/auth/staff/2fa/confirm", { secret: setup.secret, code: otp });
      toast.success("2FA enabled successfully");
      setSetup(null); onUpdate();
    } catch (e) { toast.error(e.response?.data?.detail || "Invalid code"); }
    finally { setBusy(false); }
  };

  if (setup) {
    return (
      <div className="bg-surface border border-border rounded-lg p-5 max-w-md">
        <div className="text-sm font-semibold mb-1">Scan QR Code</div>
        <p className="text-xs text-ink-muted mb-4">Scan this with your authenticator app (e.g. Google Authenticator), then enter the code.</p>
        <div className="flex justify-center mb-6 p-4 bg-white rounded-md max-w-max mx-auto border border-border/50">
          <img src={setup.qr_code_url} alt="2FA QR Code" className="w-40 h-40" data-testid="2fa-qr" />
        </div>
        <form onSubmit={confirm} className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="2fa-otp-input">
              <InputOTPGroup>{[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex gap-2 justify-center">
            <CrmButton type="button" variant="outline" size="sm" onClick={() => setSetup(null)}>Cancel</CrmButton>
            <CrmButton type="submit" variant="success" size="sm" loading={busy} disabled={otp.length !== 6} data-testid="2fa-confirm">Verify & Enable</CrmButton>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enabled ? "bg-success/10 text-success" : "bg-surface-muted text-ink-muted"}`}>
          {enabled ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
        </div>
        <div>
          <div className="text-sm font-medium">{enabled ? "2FA is enabled" : "2FA is disabled"}</div>
          <div className="text-xs text-ink-muted mt-0.5">{enabled ? "Your account is secure." : "Enable 2FA for extra security."}</div>
        </div>
      </div>
      <CrmButton variant={enabled ? "outline" : "solid"} size="sm" onClick={toggle} loading={busy} data-testid="2fa-toggle">
        {enabled ? "Disable 2FA" : "Enable 2FA"}
      </CrmButton>
    </div>
  );
}
