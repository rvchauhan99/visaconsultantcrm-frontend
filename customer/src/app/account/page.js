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
import { STAGE_LABELS, formatCaseNumber, formatInDate, cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1];

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
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16">
        
        {/* ════════════════════════════════
            LEFT COLUMN: MAIN CONTENT
        ════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          
          {/* WELCOME HEADER */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-border/60"
          >
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold tracking-wider",
                "bg-navy text-white shadow-[var(--shadow-premium)] shrink-0"
              )}>
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-3xl text-navy tracking-tight leading-none">
                    {user?.full_name || "Traveller"}
                  </h1>
                  <Stamp tone="gold" size="sm" className="hidden sm:inline-flex">
                    Passage member
                  </Stamp>
                </div>
                <p className="text-sm text-ink-muted">{user?.email}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-5 sm:gap-6 text-sm bg-surface-card p-3 rounded-2xl border border-border/50 shadow-sm">
              <div className="text-center px-2">
                <p className="text-ink-muted mb-0.5 text-[10px] uppercase tracking-widest font-mono">Total</p>
                <p className="font-display text-xl text-navy leading-none">{cases.length}</p>
              </div>
              <div className="w-px h-8 bg-border/60"></div>
              <div className="text-center px-2">
                <p className="text-ink-muted mb-0.5 text-[10px] uppercase tracking-widest font-mono">Active</p>
                <p className="font-display text-xl text-navy leading-none">{activeCount}</p>
              </div>
              <div className="w-px h-8 bg-border/60"></div>
              <div className="text-center px-2">
                <p className="text-ink-muted mb-0.5 text-[10px] uppercase tracking-widest font-mono">Done</p>
                <p className="font-display text-xl text-navy leading-none">{completedCount}</p>
              </div>
            </div>
          </motion.div>

          {/* DRAFTS */}
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
                    className="flex items-center justify-between p-4 md:p-5 border-dashed hover:shadow-[var(--shadow-premium)] transition-shadow bg-surface-card/50"
                    data-testid={`account-draft-${d.id.slice(0, 6)}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{d.product.country_flag}</span>
                      <div>
                        <div className="font-medium text-ink">{d.product.title}</div>
                        <div className="text-xs font-mono uppercase text-ink-muted tracking-widest mt-1">
                          Started {formatInDate(d.created_at, { day: "numeric", month: "short" })}
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
                        "shadow-[var(--shadow-xs)] shrink-0",
                      )}
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Continue</span>
                    </Link>
                  </Card>
                ))}
              </div>
            </motion.section>
          )}

          {/* APPLICATIONS */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease }}
          >
            <div className="flex items-baseline justify-between mb-5">
              <SectionHeader label="Applications" title="My applications" />
              <Button variant="secondary" size="sm" asChild className="shrink-0">
                <Link href="/">
                  <Plus className="w-3.5 h-3.5" />
                  New<span className="hidden sm:inline">&nbsp;application</span>
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
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
              <div className="space-y-3">
                {cases.map((c, i) => (
                  <CaseCard key={c.id} caseData={c} index={i} reduce={reduce} />
                ))}
              </div>
            )}
          </motion.section>
        </div>

        {/* ════════════════════════════════
            RIGHT COLUMN: SIDEBAR
        ════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="sticky top-8 space-y-6"
          >
            <CustomerProfile />
            <TravelerProfiles />
            <SupportCard source="account" />
          </motion.div>
        </div>

      </div>
    </div>
  );
}

/* ────────────────────────────────────
   Section header
──────────────────────────────────── */
function SectionHeader({ label, title }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-[0.26em] text-ink-muted font-mono mb-1.5">{label}</p>
      <h2 className="font-display text-2xl text-navy">{title}</h2>
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
        className="flex items-center gap-4 p-4 md:p-5 group hover:border-navy/20 transition-colors"
        data-testid={`account-case-${c.id.slice(0, 6)}`}
      >
        {/* Flag */}
        <span className="text-3xl md:text-4xl shrink-0">{c.config_snapshot_json.country_flag}</span>

        {/* Info */}
        <Link href={`/status/${c.id}`} className="flex-1 min-w-0">
          <div className="font-semibold text-ink truncate group-hover:text-navy transition-colors">
            {c.config_snapshot_json.title}
          </div>
          <div className="text-[11px] font-mono uppercase text-ink-muted tracking-widest mt-1">
            Case {formatCaseNumber(c)}
            <span className="hidden sm:inline">{" · "}{formatInDate(c.created_at, { day: "numeric", month: "short", year: "numeric" })}</span>
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

