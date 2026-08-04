"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Plane,
  ShieldCheck,
  Clock,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import api from "@/lib/api";
import { consumeNextPath, isCustomer, saveSession } from "@/lib/session";
import { isFirebaseAuthConfigured, signInWithGoogle } from "@/lib/firebase";
import Stamp from "@/components/ui/stamp";
import { FloatField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/phone-field";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleSignInButton from "@/components/auth/google-sign-in-button";
import { SUPPORT, cn } from "@/lib/utils";
import { isValidPhoneOptional } from "@/lib/phone";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import { track } from "@/lib/telemetry";

const ease = [0.16, 1, 0.3, 1];
const RESEND_COOLDOWN = 60;

const TRUST_POINTS = [
  { icon: <ShieldCheck className="w-4 h-4" />, text: "Documents encrypted, private by default" },
  { icon: <Clock className="w-4 h-4" />, text: "On-time filing guarantee — or full refund" },
  { icon: <Plane className="w-4 h-4" />, text: "Dedicated consultant reviews your case" },
];

function authErrorMessage(err, fallback = "Something went wrong") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (!detail) {
    const status = err?.response?.status;
    if (status === 404) return "Sign-in service unavailable. Please try email and password.";
    if (status === 503) return "Google sign-in is temporarily unavailable.";
    return fallback;
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message || "Invalid input").join(", ");
  }
  if (typeof detail === "object" && detail.message) return detail.message;
  return fallback;
}

function bindSubmit(handler) {
  return (event) => {
    event.preventDefault();
    event.stopPropagation();
    void Promise.resolve(handler(event)).catch((error) => {
      console.error(error);
      toast.error(authErrorMessage(error));
    });
  };
}

export default function AuthPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const googleEnabled = isFirebaseAuthConfigured();

  useEffect(() => {
    if (isCustomer()) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
  }, []);

  const goToForm = (nextMode = mode) => {
    setStep("form");
    setMode(nextMode);
    setOtp("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setPendingToken("");
  };

  const finishAuth = (token, user, successMessage) => {
    saveSession(token, user);
    toast.success(successMessage);
    router.replace(consumeNextPath("/"));
  };

  const submitGoogle = async () => {
    if (googleBusy || busy) return;
    if (!googleEnabled) {
      toast.error("Google sign-in is not configured. Add Firebase keys to customer/.env.local.");
      return;
    }
    setGoogleBusy(true);
    try {
      const idToken = await signInWithGoogle();
      const r = await api.post("/auth/customer/google", { id_token: idToken, mode });
      finishAuth(
        r.data.access_token,
        r.data.user,
        mode === "signup" ? "Account ready" : "Welcome back",
      );
      track("google_auth_success");
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      console.error(err);
      toast.error(authErrorMessage(err, err?.message || "Google sign-in failed"));
      track("google_auth_failed");
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async () => {
    if (mode === "signup" && password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (mode === "signup" && !isValidPhoneOptional(phone)) {
      toast.error("Enter a valid phone number for the selected country");
      return;
    }
    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/auth/customer/login" : "/auth/customer/register";
      const body = mode === "login"
        ? { email, password }
        : { email, password, full_name: name, phone: phone || null };
      const r = await api.post(endpoint, body);

      if (mode === "login") {
        finishAuth(r.data.access_token, r.data.user, "Welcome back");
        track("login_success");
        return;
      }

      setPendingToken(r.data.pending_token);
      setEmail(r.data.email || email);
      setStep("verify-signup");
      startResendCooldown();
      toast.success("Check your email for a verification code");
      track("register_pending_verify");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (
        mode === "login"
        && typeof detail === "object"
        && detail?.code === "email_verification_required"
      ) {
        setPendingToken(detail.pending_token);
        setEmail(detail.email || email);
        setStep("verify-signup");
        startResendCooldown();
        toast.info("Please verify your email to continue");
        return;
      }
      toast.error(authErrorMessage(err, "Authentication failed"));
      track("auth_failed", { mode });
    } finally {
      setBusy(false);
    }
  };

  const verifySignupOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const r = await api.post("/auth/customer/register/verify-otp", {
        pending_token: pendingToken,
        code: otp,
      });
      finishAuth(r.data.access_token, r.data.user, "Email verified — welcome!");
      track("register_success");
    } catch (err) {
      toast.error(authErrorMessage(err, "Verification failed"));
    } finally {
      setBusy(false);
    }
  };

  const resendSignupOtp = async () => {
    if (resendCooldown > 0 || !pendingToken) return;
    setBusy(true);
    try {
      await api.post("/auth/customer/register/resend-otp", { pending_token: pendingToken });
      startResendCooldown();
      toast.success("Verification code resent");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not resend code"));
    } finally {
      setBusy(false);
    }
  };

  const requestForgotPassword = async () => {
    setBusy(true);
    try {
      const r = await api.post("/auth/customer/forgot-password", { email });
      toast.success(r.data.message || "If an account exists, a reset code has been sent.");
      startResendCooldown();
      track("forgot_password_requested");
      return true;
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not send reset code"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitForgotEmail = async () => {
    const ok = await requestForgotPassword();
    if (ok) setStep("forgot-reset");
  };

  const submitForgotReset = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/customer/forgot-password/reset", {
        email,
        code: otp,
        new_password: newPassword,
      });
      toast.success("Password updated — sign in with your new password");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setNewPasswordConfirm("");
      goToForm("login");
      track("forgot_password_reset");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not reset password"));
    } finally {
      setBusy(false);
    }
  };

  const heading = (() => {
    if (step === "verify-signup") {
      return { title: "Verify your email", subtitle: `We sent a 6-digit code to ${email}` };
    }
    if (step === "forgot-email") {
      return { title: "Reset password", subtitle: "Enter your account email and we'll send a reset code." };
    }
    if (step === "forgot-reset") {
      return { title: "Set a new password", subtitle: `Enter the code sent to ${email}` };
    }
    return {
      title: mode === "login" ? "Welcome back" : "Begin your passage",
      subtitle: mode === "login"
        ? "Sign in to track and manage your applications."
        : "For Indian passport holders — calm, private, carefully guided.",
    };
  })();

  const showModeTabs = step === "form";

  return (
    <div className="auth-glass-page min-h-[calc(100dvh-4rem)] relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[#ebe7e1]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_8%_15%,rgba(176,141,87,0.28),transparent_52%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_92%_85%,rgba(43,92,255,0.1),transparent_48%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(255,255,255,0.45),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(28,20,16,0.07) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="relative grid md:grid-cols-2 min-h-[calc(100dvh-4rem)]">
        <div className="hidden md:flex flex-col relative p-5 lg:p-8 xl:p-10 min-h-0">
          <div className="auth-glass-panel flex flex-col h-full min-h-[min(640px,calc(100dvh-6rem))] p-7 lg:p-10 xl:p-12 rounded-[24px] lg:rounded-[28px]">
            <div className="mb-8 lg:mb-12">
              <AmaraVisaLogo size="lg" className="opacity-95" />
            </div>

            <div className="flex-1 flex flex-col justify-center min-w-0">
              <Stamp tone="gold" size="sm" className="mb-5 lg:mb-6 self-start">
                Visa consultancy
              </Stamp>

              <h2 className="font-display text-[clamp(1.75rem,3.5vw,3rem)] text-ink leading-[1.08] tracking-tight mb-4 lg:mb-6">
                A quieter way<br />
                to travel{" "}
                <span className="italic text-gold">papers.</span>
              </h2>

              <p className="text-sm lg:text-base text-ink-muted leading-relaxed max-w-sm mb-8 lg:mb-10">
                For Indian passport holders who want calm, private, carefully guided visa support — not a portal maze.
              </p>

              <div className="space-y-3 lg:space-y-4">
                {TRUST_POINTS.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.12, ease }}
                    className="flex items-center gap-3 text-sm text-ink-muted"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full bg-white/70 border border-black/8 flex items-center justify-center text-ink shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                      {p.icon}
                    </span>
                    <span className="min-w-0">{p.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8 lg:mt-10 text-sm text-ink-muted break-words">
              Need help?{" "}
              <a href={`mailto:${SUPPORT.email}`} className="text-ink font-medium hover:text-gold transition-colors">
                {SUPPORT.email}
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-4 sm:px-8 md:px-10 lg:px-14 py-8 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="auth-glass-card w-full max-w-md p-5 sm:p-7 md:p-8 rounded-[22px] sm:rounded-[28px]">
          <div className="md:hidden text-center mb-6 sm:mb-8 flex justify-center">
            <AmaraVisaLogo size="md" />
          </div>

          {showModeTabs && (
            <div className="flex mb-8 bg-white/50 backdrop-blur-sm rounded-2xl p-1 border border-white/60">
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-300",
                    mode === m
                      ? "bg-white text-ink shadow-[var(--shadow-card)]"
                      : "text-ink-muted hover:text-ink",
                  )}
                  data-testid={`auth-tab-${m}`}
                >
                  {m === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          )}

          <motion.div
            key={`${step}-${mode}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="mb-7"
          >
            {step !== "form" && (
              <button
                type="button"
                onClick={() => goToForm(step === "verify-signup" ? "signup" : "login")}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <h1 className="font-display text-[clamp(1.75rem,5vw,2.25rem)] md:text-4xl text-ink tracking-tight">
              {heading.title}
            </h1>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              {heading.subtitle}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.div
                key="form"
                initial={reduce ? false : { opacity: 0, x: mode === "signup" ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
              >
                <div className="mb-6 space-y-4">
                  <GoogleSignInButton
                    onClick={() => { void submitGoogle(); }}
                    loading={googleBusy}
                    disabled={busy}
                  />
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs uppercase tracking-wider text-ink-muted">
                      or continue with email
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </div>

                <form onSubmit={bindSubmit(submit)} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <FloatField
                      label="Full name (as on passport)"
                      prefixIcon={User}
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="auth-name"
                    />
                    <PhoneField
                      label="Phone (recommended)"
                      variant="float"
                      value={phone}
                      onChange={setPhone}
                      data-testid="auth-phone"
                      hint="Needed when you apply for a visa"
                    />
                  </>
                )}

                <FloatField
                  label="Email address"
                  type="email"
                  prefixIcon={Mail}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="auth-email"
                  autoComplete="email"
                />

                <FloatField
                  label="Password"
                  type="password"
                  prefixIcon={Lock}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="auth-password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />

                {mode === "signup" && (
                  <FloatField
                    label="Confirm password"
                    type="password"
                    prefixIcon={Lock}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    data-testid="auth-password-confirm"
                  />
                )}

                <Button
                  type="submit"
                  variant="solid"
                  size="lg"
                  loading={busy}
                  className="w-full mt-2 !bg-ink hover:!bg-ink/90 shadow-[0_4px_16px_rgba(28,20,16,0.18)]"
                  data-testid="auth-submit"
                >
                  {mode === "login" ? "Sign in" : "Create account"}
                  {!busy && <ArrowRight className="w-4 h-4" />}
                </Button>
                </form>
              </motion.div>
            )}

            {step === "verify-signup" && (
              <motion.div
                key="verify-signup"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <form onSubmit={bindSubmit(verifySignupOtp)} className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value || "")}
                    data-testid="auth-verify-otp"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  variant="solid"
                  size="lg"
                  loading={busy}
                  disabled={otp.length !== 6}
                  className="w-full !bg-ink hover:!bg-ink/90 shadow-[0_4px_16px_rgba(28,20,16,0.18)]"
                  data-testid="auth-verify-submit"
                >
                  Verify email
                  {!busy && <ArrowRight className="w-4 h-4" />}
                </Button>

                <p className="text-center text-sm text-ink-muted">
                  Didn&apos;t get the code?{" "}
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || busy}
                    onClick={() => { void resendSignupOtp(); }}
                    className="text-ink hover:text-gold font-medium disabled:opacity-50"
                    data-testid="auth-resend-otp"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </p>
                </form>
              </motion.div>
            )}

            {step === "forgot-email" && (
              <motion.div
                key="forgot-email"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <form onSubmit={bindSubmit(submitForgotEmail)} className="space-y-4">
                <FloatField
                  label="Email address"
                  type="email"
                  prefixIcon={Mail}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="forgot-email-input"
                  autoComplete="email"
                />

                <Button
                  type="submit"
                  variant="solid"
                  size="lg"
                  loading={busy}
                  className="w-full mt-2 !bg-ink hover:!bg-ink/90 shadow-[0_4px_16px_rgba(28,20,16,0.18)]"
                  data-testid="forgot-email-submit"
                >
                  Send reset code
                  {!busy && <ArrowRight className="w-4 h-4" />}
                </Button>
                </form>
              </motion.div>
            )}

            {step === "forgot-reset" && (
              <motion.div
                key="forgot-reset"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <form onSubmit={bindSubmit(submitForgotReset)} className="space-y-4">
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value || "")}
                    data-testid="forgot-reset-otp"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <FloatField
                  label="New password"
                  type="password"
                  prefixIcon={Lock}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="forgot-new-password"
                  autoComplete="new-password"
                />

                <FloatField
                  label="Confirm new password"
                  type="password"
                  prefixIcon={Lock}
                  required
                  minLength={6}
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  data-testid="forgot-new-password-confirm"
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  variant="solid"
                  size="lg"
                  loading={busy}
                  disabled={otp.length !== 6}
                  className="w-full mt-2 !bg-ink hover:!bg-ink/90 shadow-[0_4px_16px_rgba(28,20,16,0.18)]"
                  data-testid="forgot-reset-submit"
                >
                  Update password
                  {!busy && <ArrowRight className="w-4 h-4" />}
                </Button>

                <p className="text-center text-sm text-ink-muted">
                  Didn&apos;t get the code?{" "}
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || busy}
                    onClick={() => { void requestForgotPassword(); }}
                    className="text-ink hover:text-gold font-medium disabled:opacity-50"
                    data-testid="forgot-resend-otp"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 space-y-3 text-center">
            {step === "form" && mode === "login" && (
              <p className="text-sm text-ink-muted">
                Forgot password?{" "}
                <button
                  type="button"
                  className="text-ink hover:text-gold font-medium transition-colors"
                  data-testid="forgot-password-link"
                  onClick={() => {
                    track("forgot_password_click");
                    setStep("forgot-email");
                  }}
                >
                  Reset with email code
                </button>
              </p>
            )}
            {step === "form" && (
              <p className="text-sm text-ink-muted">
                {mode === "login" ? "New here? " : "Have an account? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-ink hover:text-gold font-medium transition-colors underline underline-offset-3"
                  data-testid="auth-toggle"
                >
                  {mode === "login" ? "Create an account" : "Sign in instead"}
                </button>
              </p>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
