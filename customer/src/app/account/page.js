"use client";

import Link from "next/link";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { FileEdit, Plus, Receipt, Briefcase, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import RequireCustomer from "@/components/auth/require-customer";
import CustomerProfile from "@/components/customer/customer-profile";
import TravelerProfiles from "@/components/customer/traveler-profiles";
import SupportCard from "@/components/customer/support-card";
import Stamp from "@/components/ui/stamp";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDrafts, useMyCases } from "@/hooks/customer-api";
import { openReceipt } from "@/lib/api";
import { getUser } from "@/lib/session";
import { STAGE_LABELS, formatInDate, cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1];

const stageStyles = {
  overdue: "danger",
  due_soon: "warning",
  completed: "gold",
  default: "success",
};

export default function AccountPage() {
  return (
    <RequireCustomer>
      <AccountHub />
    </RequireCustomer>
  );
}

function AccountHub() {
  const reduce = useReducedMotion();
  const user = getUser();
  const { data: cases = [], isLoading, isError, refetch } = useMyCases(true);
  const { data: drafts = [] } = useDrafts(true);

  const completedCount = cases.filter((c) => c.stage === "completed" || c.stage === "delivered").length;
  const activeCount = cases.filter((c) => c.stage !== "completed" && c.stage !== "delivered").length;

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-10 md:py-14 space-y-10">

      {/* ════════════════════════════════
          WELCOME HEADER
      ════════════════════════════════ */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="relative overflow-hidden rounded-[24px] p-7 md:p-9 border border-border"
        style={{
          background: "linear-gradient(145deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
        }}
      >
        {/* Background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_80%_20%,rgba(176,141,87,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_10%_80%,rgba(47,107,90,0.3),transparent_60%)]" />

        <div className="relative flex items-start justify-between gap-6">
          {/* Left */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold",
              "bg-[var(--glass)] backdrop-blur-xl border-2 border-[var(--border-glass)]",
              "text-surface-card shadow-[var(--shadow-premium)]",
              "shrink-0",
            )}>
              {initials}
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] font-mono text-surface-muted/50 mb-1">
                Welcome back
              </p>
              <h1 className="font-display text-2xl md:text-3xl text-surface-card tracking-tight leading-tight">
                {user?.full_name || "Traveller"}
              </h1>
              <p className="text-sm text-surface-muted/60 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <Stamp tone="gold" size="sm" className="shrink-0 self-start">
            Passage member
          </Stamp>
        </div>

        {/* Stats row */}
        <div className="relative mt-7 grid grid-cols-3 gap-3">
          <StatCard value={cases.length} label="Total cases" icon={<Briefcase className="w-4 h-4" />} />
          <StatCard value={activeCount} label="Active" icon={<Clock className="w-4 h-4" />} />
          <StatCard value={completedCount} label="Completed" icon={<CheckCircle2 className="w-4 h-4" />} />
        </div>
      </motion.div>

      {/* Profile & Travelers */}
      <div className="space-y-6">
        <CustomerProfile />
        <TravelerProfiles />
      </div>

      {/* ════════════════════════════════
          DRAFTS
      ════════════════════════════════ */}
      {drafts.length > 0 && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease }}
        >
          <SectionHeader label="Drafts" title="Continue where you left off" />
          <div className="space-y-3">
            {drafts.map((d) => (
              <Card
                key={d.id}
                variant="default"
                className="flex items-center justify-between p-4 md:p-5 border-dashed hover:shadow-[var(--shadow-premium)] transition-shadow"
                data-testid={`account-draft-${d.id.slice(0, 6)}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{d.product.country_flag}</span>
                  <div>
                    <div className="font-medium text-ink">{d.product.title}</div>
                    <div className="text-xs font-mono uppercase text-ink-muted tracking-widest mt-0.5">
                      Started {formatInDate(d.created_at, { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}Step: {d.step || "traveler"}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/apply/${d.visa_product_id}?draft=${d.id}`}
                  data-testid={`continue-draft-${d.id.slice(0, 6)}`}
                  className={cn(
                    "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full",
                    "border border-navy/25 text-navy",
                    "hover:bg-navy hover:text-white hover:border-navy transition-all duration-200",
                    "shadow-[var(--shadow-xs)]",
                  )}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Continue
                </Link>
              </Card>
            ))}
          </div>
        </motion.section>
      )}

      {/* ════════════════════════════════
          APPLICATIONS
      ════════════════════════════════ */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease }}
      >
        <div className="flex items-baseline justify-between mb-5">
          <SectionHeader label="Applications" title="My applications" />
          <Button variant="secondary" size="sm" asChild>
            <Link href="/">
              <Plus className="w-3.5 h-3.5" />
              New application
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load applications" onRetry={() => refetch()} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Start your first visa application"
            description="Choose a destination and we'll take it from there."
            action={
              <Button asChild data-testid="account-start-cta">
                <Link href="/">
                  <Plus className="w-4 h-4" />
                  Browse destinations
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {cases.map((c, i) => (
              <CaseCard key={c.id} caseData={c} index={i} reduce={reduce} />
            ))}
          </div>
        )}
      </motion.section>

      <SupportCard source="account" />
    </div>
  );
}

/* ────────────────────────────────────
   Section header
──────────────────────────────────── */
function SectionHeader({ label, title }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] uppercase tracking-[0.26em] text-ink-muted font-mono mb-1.5">{label}</p>
      <h2 className="font-display text-2xl text-navy">{title}</h2>
    </div>
  );
}

/* ────────────────────────────────────
   Stats card (inside welcome panel)
──────────────────────────────────── */
function StatCard({ value, label, icon }) {
  return (
    <div className={cn(
      "rounded-2xl p-4 text-center",
      "bg-[var(--glass)] backdrop-blur-xl border border-[var(--border-glass)]",
    )}>
      <div className="flex justify-center mb-2 text-surface-muted/60">{icon}</div>
      <div className="font-display text-2xl text-surface-card leading-none">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-surface-muted/50 mt-1">{label}</div>
    </div>
  );
}

/* ────────────────────────────────────
   Application case card
──────────────────────────────────── */
function CaseCard({ caseData: c, index, reduce }) {
  const slaStyle = c.sla_status === "overdue" ? "danger"
    : c.sla_status === "due_soon" ? "warning"
    : c.sla_status === "completed" ? "gold"
    : "success";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease }}
    >
      <Card
        variant="premium"
        className="flex items-center gap-4 p-5 md:p-6 group"
        data-testid={`account-case-${c.id.slice(0, 6)}`}
      >
        {/* Flag */}
        <span className="text-3xl md:text-4xl shrink-0">{c.config_snapshot_json.country_flag}</span>

        {/* Info */}
        <Link href={`/status/${c.id}`} className="flex-1 min-w-0">
          <div className="font-semibold text-ink truncate group-hover:text-navy transition-colors">
            {c.config_snapshot_json.title}
          </div>
          <div className="text-xs font-mono uppercase text-ink-muted tracking-widest mt-1">
            Case #{c.id.slice(0, 8)}
            {" · "}
            {formatInDate(c.created_at, { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </Link>

        {/* Right: stage + due + receipt */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Stamp tone={slaStyle} size="sm">
            {STAGE_LABELS[c.stage] || c.stage}
          </Stamp>
          <span className="text-[10px] font-mono uppercase text-ink-muted">
            By {formatInDate(c.sla_due_date)}
          </span>
          {c.payment_status === "paid" && (
            <button
              type="button"
              onClick={() => openReceipt(c.id).catch(() => toast.error("Couldn't open receipt"))}
              data-testid={`account-receipt-${c.id.slice(0, 6)}`}
              className="inline-flex items-center gap-1 text-[11px] text-teal hover:text-navy hover:underline underline-offset-2 transition-colors mt-0.5"
            >
              <Receipt className="w-3 h-3" />
              Receipt
            </button>
          )}
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 text-ink-muted/40 group-hover:text-navy group-hover:translate-x-0.5 transition-all shrink-0 hidden md:block" />
      </Card>
    </motion.div>
  );
}
