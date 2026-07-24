"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, User, Phone, Plane, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { consumeNextPath, isCustomer, saveSession } from "@/lib/session";
import Stamp from "@/components/ui/stamp";
import { FloatField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SUPPORT, cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";

const ease = [0.16, 1, 0.3, 1];

const TRUST_POINTS = [
  { icon: <ShieldCheck className="w-4 h-4" />, text: "Documents encrypted, private by default" },
  { icon: <Clock className="w-4 h-4" />, text: "On-time filing guarantee — or full refund" },
  { icon: <Plane className="w-4 h-4" />, text: "Dedicated consultant reviews your case" },
];

export default function AuthPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isCustomer()) router.replace("/account");
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/auth/customer/login" : "/auth/customer/register";
      const body = mode === "login" ? { email, password } : { email, password, full_name: name, phone };
      const r = await api.post(endpoint, body);
      saveSession(r.data.access_token, r.data.user);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      track(mode === "login" ? "login_success" : "register_success");
      router.replace(consumeNextPath("/account"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
      track("auth_failed", { mode });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] grid md:grid-cols-2">

      {/* ════════════════════════════════
          LEFT — Brand panel (desktop only)
      ════════════════════════════════ */}
      <div className="hidden md:flex flex-col relative overflow-hidden bg-navy-deep">
        {/* Background layers */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_40%,rgba(47,107,90,0.5),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(176,141,87,0.12),transparent_60%)]" />
          {/* Grain */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
              backgroundSize: "180px",
            }}
          />
        </div>

        <div className="relative flex flex-col h-full p-10 lg:p-14">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-double border-gold/60 text-gold/80">
              <Plane className="w-3.5 h-3.5 -rotate-45" strokeWidth={2} />
            </span>
            <span className="font-display text-2xl text-surface-card tracking-tight">Passage</span>
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center">
            <Stamp tone="gold" size="sm" className="mb-6 self-start">
              Editorial visa atelier
            </Stamp>

            <h2 className="font-display text-4xl lg:text-5xl text-surface-card leading-[1.08] tracking-tight mb-6">
              A quieter way<br />
              to travel{" "}
              <span className="italic text-gold/90">papers.</span>
            </h2>

            <p className="text-base text-surface-muted/70 leading-relaxed max-w-sm mb-10">
              For Indian passport holders who want calm, private, carefully guided visa support — not a portal maze.
            </p>

            {/* Trust points */}
            <div className="space-y-4">
              {TRUST_POINTS.map((p, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.12, ease }}
                  className="flex items-center gap-3 text-sm text-surface-muted/70"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-teal/20 border border-teal/25 flex items-center justify-center text-teal/80">
                    {p.icon}
                  </span>
                  {p.text}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom contact */}
          <div className="mt-10 text-sm text-surface-muted/40">
            Need help?{" "}
            <a href={`mailto:${SUPPORT.email}`} className="text-gold/70 hover:text-gold transition-colors">
              {SUPPORT.email}
            </a>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT — Auth form
      ════════════════════════════════ */}
      <div className="flex flex-col items-center justify-center px-5 sm:px-10 md:px-12 lg:px-16 py-12 bg-surface">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-full border-2 border-double border-navy text-navy flex items-center justify-center">
                <Plane className="w-3 h-3 -rotate-45" strokeWidth={2} />
              </span>
              <span className="font-display text-2xl text-navy">Passage</span>
            </div>
          </div>

          {/* Mode toggle tabs */}
          <div className="flex mb-8 bg-surface-muted rounded-2xl p-1">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-300",
                  mode === m
                    ? "bg-surface-card text-navy shadow-[var(--shadow-card)]"
                    : "text-ink-muted hover:text-ink",
                )}
                data-testid={`auth-tab-${m}`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <motion.div
            key={mode}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="mb-7"
          >
            <h1 className="font-display text-3xl md:text-4xl text-navy tracking-tight">
              {mode === "login" ? "Welcome back" : "Begin your passage"}
            </h1>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              {mode === "login"
                ? "Sign in to track and manage your applications."
                : "For Indian passport holders — calm, private, carefully guided."}
            </p>
          </motion.div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={submit}
              initial={reduce ? false : { opacity: 0, x: mode === "signup" ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="space-y-4"
            >
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
                  <FloatField
                    label="Phone (recommended)"
                    type="tel"
                    prefixIcon={Phone}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                variant="primary"
                size="lg"
                loading={busy}
                className="w-full mt-2"
                data-testid="auth-submit"
              >
                {mode === "login" ? "Sign in" : "Create account"}
                {!busy && <ArrowRight className="w-4 h-4" />}
              </Button>
            </motion.form>
          </AnimatePresence>

          {/* Footer links */}
          <div className="mt-6 space-y-3 text-center">
            {mode === "login" && (
              <p className="text-sm text-ink-muted">
                Forgot password?{" "}
                <a
                  href={`mailto:${SUPPORT.email}?subject=Password%20reset`}
                  className="text-teal hover:text-navy font-medium transition-colors"
                  data-testid="forgot-password-link"
                  onClick={() => track("forgot_password_click")}
                >
                  Email support
                </a>
              </p>
            )}
            <p className="text-sm text-ink-muted">
              {mode === "login" ? "New here? " : "Have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-teal hover:text-navy font-medium transition-colors underline underline-offset-3"
                data-testid="auth-toggle"
              >
                {mode === "login" ? "Create an account" : "Sign in instead"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
