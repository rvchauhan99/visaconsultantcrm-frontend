import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Shield, ShieldOff, User } from "lucide-react";
import api, { clearSession, getUser, saveSession, getToken } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Stamp from "@/components/Stamp";

const inp =
    "w-full h-9 px-3 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy";

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

    useEffect(() => {
        load();
    }, []);

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-5 h-5 animate-spin text-ink-muted" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-6 text-sm text-ink-muted">Profile unavailable.</div>
        );
    }

    const initial = (profile.full_name || profile.email || "?").trim().charAt(0).toUpperCase();

    return (
        <div className="p-4 md:p-6 max-w-5xl" data-testid="staff-profile-page">
            <div className="mb-4">
                <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">Account</div>
                <h1 className="text-lg font-semibold">User profile</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
                <aside className="bg-surface-card border border-border rounded-sm overflow-hidden">
                    <div className="border-t-4 border-navy p-5 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full border-2 border-border bg-surface flex items-center justify-center text-2xl font-semibold text-navy mb-2">
                            {initial}
                        </div>
                        <div className="text-sm font-semibold">{profile.full_name}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-muted mt-0.5">
                            {profile.role}
                        </div>
                        <div className="mt-2">
                            {profile.two_factor_enabled ? (
                                <Stamp tone="success">2FA on</Stamp>
                            ) : (
                                <Stamp tone="muted">2FA off</Stamp>
                            )}
                        </div>
                    </div>
                    <div className="px-4 pb-4 space-y-2 text-xs border-t border-border pt-3">
                        <Row label="Email" value={profile.email} accent />
                        <Row label="Role" value={profile.role} />
                        <Row
                            label="Countries"
                            value={
                                (profile.country_codes || []).length
                                    ? profile.country_codes.join(", ")
                                    : "—"
                            }
                        />
                    </div>
                </aside>

                <div className="bg-surface-card border border-border rounded-sm min-w-0">
                    <Tabs defaultValue="details">
                        <div className="border-b border-border px-2">
                            <TabsList className="h-10 bg-transparent rounded-none p-0 gap-0">
                                <TabsTrigger
                                    value="details"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-navy data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3"
                                    data-testid="profile-tab-details"
                                >
                                    Details
                                </TabsTrigger>
                                <TabsTrigger
                                    value="password"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-navy data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3"
                                    data-testid="profile-tab-password"
                                >
                                    Change password
                                </TabsTrigger>
                                <TabsTrigger
                                    value="2fa"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-navy data-[state=active]:shadow-none data-[state=active]:bg-transparent px-3"
                                    data-testid="profile-tab-2fa"
                                >
                                    Two-factor auth
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="details" className="p-4 mt-0">
                            <DetailsForm profile={profile} onSaved={setProfile} />
                        </TabsContent>
                        <TabsContent value="password" className="p-4 mt-0">
                            <ChangePasswordForm
                                onSuccess={() => {
                                    clearSession();
                                    nav("/login");
                                }}
                            />
                        </TabsContent>
                        <TabsContent value="2fa" className="p-4 mt-0">
                            <TwoFactorPanel
                                enabled={!!profile.two_factor_enabled}
                                onChanged={load}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, accent }) {
    return (
        <div className="flex justify-between gap-3">
            <span className="text-ink-muted shrink-0">{label}</span>
            <span className={`text-right break-all ${accent ? "text-navy" : "text-ink"}`}>{value}</span>
        </div>
    );
}

function DetailsForm({ profile, onSaved }) {
    const [fullName, setFullName] = useState(profile.full_name || "");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setFullName(profile.full_name || "");
    }, [profile.full_name]);

    const submit = async (e) => {
        e.preventDefault();
        const name = fullName.trim();
        if (!name) {
            toast.error("Full name is required");
            return;
        }
        setBusy(true);
        try {
            const r = await api.patch("/staff/me", { full_name: name });
            onSaved(r.data);
            const token = getToken();
            const sessionUser = getUser() || {};
            if (token) {
                saveSession(token, {
                    ...sessionUser,
                    full_name: r.data.full_name,
                    two_factor_enabled: !!r.data.two_factor_enabled,
                    country_codes: r.data.country_codes || [],
                });
            }
            toast.success("Profile updated");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Could not update profile");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3 max-w-md" data-testid="profile-details-form">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <User className="w-4 h-4 text-ink-muted" /> Details
            </div>
            <label className="block">
                <span className="text-xs text-ink-muted mb-1 block">Full name</span>
                <input
                    className={inp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    data-testid="profile-full-name"
                />
            </label>
            <label className="block">
                <span className="text-xs text-ink-muted mb-1 block">Email</span>
                <input className={`${inp} bg-surface text-ink-muted`} value={profile.email || ""} disabled />
            </label>
            <label className="block">
                <span className="text-xs text-ink-muted mb-1 block">Role</span>
                <input className={`${inp} bg-surface text-ink-muted`} value={profile.role || ""} disabled />
            </label>
            <button
                type="submit"
                disabled={busy}
                className="h-9 px-4 bg-navy text-white rounded-sm text-sm hover:bg-navy-hover disabled:opacity-50 inline-flex items-center gap-2"
                data-testid="profile-save-details"
            >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
            </button>
        </form>
    );
}

function ChangePasswordForm({ onSuccess }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("All fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirm password must match");
            return;
        }
        if (newPassword === currentPassword) {
            toast.error("New password must be different from current password");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        setBusy(true);
        try {
            await api.post("/staff/me/change-password", {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            toast.success("Password changed. Please sign in again.");
            setTimeout(onSuccess, 800);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Could not change password");
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3 max-w-md" data-testid="profile-password-form">
            <div className="text-sm font-medium mb-1">Change password</div>
            <label className="block">
                <span className="text-xs text-ink-muted mb-1 block">Current password</span>
                <input
                    type="password"
                    className={inp}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    data-testid="profile-current-password"
                />
            </label>
            <label className="block">
                <span className="text-xs text-ink-muted mb-1 block">New password</span>
                <input
                    type="password"
                    className={inp}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="profile-new-password"
                />
            </label>
            <label className="block">
                <span className="text-xs text-ink-muted mb-1 block">Confirm password</span>
                <input
                    type="password"
                    className={inp}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="profile-confirm-password"
                />
            </label>
            <button
                type="submit"
                disabled={busy}
                className="h-9 px-4 bg-rose-700 text-white rounded-sm text-sm hover:bg-rose-800 disabled:opacity-50 inline-flex items-center gap-2"
                data-testid="profile-change-password"
            >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Change password
            </button>
        </form>
    );
}

function TwoFactorPanel({ enabled, onChanged }) {
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [code, setCode] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [busy, setBusy] = useState(false);

    const generate = async () => {
        setBusy(true);
        try {
            const issuer =
                typeof window !== "undefined" && window.location?.hostname
                    ? window.location.hostname
                    : undefined;
            const r = await api.post("/auth/staff/2fa/generate", { issuer });
            setQrCode(r.data.qr_code_data_url);
            setSecret(r.data.secret);
            setCode("");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Could not generate QR code");
        } finally {
            setBusy(false);
        }
    };

    const enable = async () => {
        if (code.length !== 6) {
            toast.error("Enter the 6-digit code");
            return;
        }
        setBusy(true);
        try {
            await api.post("/auth/staff/2fa/enable", { code });
            toast.success("Two-factor authentication enabled");
            setQrCode("");
            setSecret("");
            setCode("");
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Invalid code");
        } finally {
            setBusy(false);
        }
    };

    const disable = async () => {
        if (disableCode.length !== 6) {
            toast.error("Enter the 6-digit code to disable 2FA");
            return;
        }
        if (!window.confirm("Disable two-factor authentication?")) return;
        setBusy(true);
        try {
            await api.post("/auth/staff/2fa/disable", { code: disableCode });
            toast.success("Two-factor authentication disabled");
            setDisableCode("");
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Could not disable 2FA");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3 max-w-lg" data-testid="profile-2fa-panel">
            <div className="flex items-center gap-2 text-sm font-medium">
                {enabled ? <Shield className="w-4 h-4 text-emerald-700" /> : <ShieldOff className="w-4 h-4 text-ink-muted" />}
                Two-factor authentication
            </div>

            {enabled ? (
                <div className="space-y-3">
                    <div className="text-xs border border-emerald-200 bg-emerald-50 text-emerald-900 rounded-sm px-3 py-2">
                        Two-factor authentication is currently <strong>enabled</strong>.
                    </div>
                    <label className="block">
                        <span className="text-xs text-ink-muted mb-1 block">Authenticator code</span>
                        <InputOTP maxLength={6} value={disableCode} onChange={setDisableCode} data-testid="profile-2fa-disable-code">
                            <InputOTPGroup>
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <InputOTPSlot key={i} index={i} />
                                ))}
                            </InputOTPGroup>
                        </InputOTP>
                    </label>
                    <button
                        type="button"
                        onClick={disable}
                        disabled={busy || disableCode.length !== 6}
                        className="h-9 px-4 bg-rose-700 text-white rounded-sm text-sm hover:bg-rose-800 disabled:opacity-50 inline-flex items-center gap-2"
                        data-testid="profile-2fa-disable"
                    >
                        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Disable 2FA
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="text-xs border border-amber-200 bg-amber-50 text-amber-950 rounded-sm px-3 py-2">
                        Two-factor authentication is currently <strong>disabled</strong>.
                    </div>

                    {!qrCode ? (
                        <button
                            type="button"
                            onClick={generate}
                            disabled={busy}
                            className="h-9 px-4 bg-navy text-white rounded-sm text-sm hover:bg-navy-hover disabled:opacity-50 inline-flex items-center gap-2"
                            data-testid="profile-2fa-enable-start"
                        >
                            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Enable 2FA
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-ink-muted">
                                1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
                            </p>
                            <img
                                src={qrCode}
                                alt="2FA QR code"
                                className="border border-border p-1 w-44 h-44 bg-surface-card"
                            />
                            <p className="text-[11px] font-mono text-ink-muted break-all">
                                Secret: {secret}
                            </p>
                            <p className="text-xs text-ink-muted">
                                2. Enter the 6-digit code to verify and enable.
                            </p>
                            <InputOTP maxLength={6} value={code} onChange={setCode} data-testid="profile-2fa-enable-code">
                                <InputOTPGroup>
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <InputOTPSlot key={i} index={i} />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                            <button
                                type="button"
                                onClick={enable}
                                disabled={busy || code.length !== 6}
                                className="h-9 px-4 bg-emerald-700 text-white rounded-sm text-sm hover:bg-emerald-800 disabled:opacity-50 inline-flex items-center gap-2"
                                data-testid="profile-2fa-verify-enable"
                            >
                                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Verify &amp; enable
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
