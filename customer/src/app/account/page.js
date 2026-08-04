"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { FileEdit, Plus, Receipt, Briefcase, ArrowRight, LogOut } from "lucide-react";
import RequireCustomer from "@/components/auth/require-customer";
import CustomerProfile from "@/components/customer/customer-profile";
import TravelerProfiles from "@/components/customer/traveler-profiles";
import SupportCard from "@/components/customer/support-card";
import Stamp from "@/components/ui/stamp";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDrafts, useMyCases } from "@/hooks/customer-api";
import { openReceipt } from "@/lib/api";
import { clearSession, getUser } from "@/lib/session";
import { signOutCustomer } from "@/lib/firebase";
import { track } from "@/lib/telemetry";
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
  const router = useRouter();
  const reduce = useReducedMotion();
  const user = getUser();
  const { data: cases = [], isLoading, isError, refetch } = useMyCases(true);
  const { data: drafts = [] } = useDrafts(true);

  const completedCount = cases.filter((c) => c.stage === "completed" || c.stage === "delivered" || c.stage === "closed").length;
  const activeCount = cases.filter((c) => !["completed", "delivered", "closed"].includes(c.stage)).length;

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const logout = async () => {
    await signOutCustomer();
    clearSession();
    track("logout");
    router.push("/");
  };

  return (
    <div className="account-glass-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 md:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10">

          {/* Main column */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* Welcome + stats */}
            <motion.section
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease }}
              className="account-glass-panel p-5 sm:p-6 md:p-7"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold tracking-wider shrink-0",
                      "bg-navy text-white shadow-[0_8px_24px_rgba(31,74,58,0.25)]",
                    )}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                      <h1 className="font-display text-2xl sm:text-3xl text-navy tracking-tight leading-none truncate">
                        {user?.full_name || "Traveller"}
                      </h1>
                      <Stamp tone="gold" size="sm" className="hidden xs:inline-flex sm:inline-flex">
                        AmaraVisa member
                      </Stamp>
                    </div>
                    <p className="text-sm text-ink-muted truncate">{user?.email}</p>
                    <button
                      type="button"
                      onClick={logout}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-danger transition-colors"
                      data-testid="account-logout-header"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>

                <div className="account-glass-panel account-glass-panel--soft flex items-stretch gap-0 sm:gap-1 p-2 sm:p-2.5 rounded-2xl shrink-0 self-start sm:self-center">
                  <Stat label="Total" value={cases.length} />
                  <div className="w-px self-stretch bg-border/50 my-1" aria-hidden />
                  <Stat label="Active" value={activeCount} />
                  <div className="w-px self-stretch bg-border/50 my-1" aria-hidden />
                  <Stat label="Done" value={completedCount} />
                </div>
              </div>
            </motion.section>

            {/* Drafts */}
            {drafts.length > 0 && (
              <motion.section
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08, ease }}
                className="account-glass-panel p-5 sm:p-6"
              >
                <SectionHeader label="Drafts" title="Continue where you left off" />
                <div className="space-y-3 mt-4">
                  {drafts.map((d) => (
                    <Card
                      key={d.id}
                      variant="glass"
                      className="flex items-center justify-between gap-3 p-4 border-dashed"
                      data-testid={`account-draft-${d.id.slice(0, 6)}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-3xl shrink-0">{d.product.country_flag}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-ink truncate">{d.product.title}</div>
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
                          "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full shrink-0",
                          "border border-navy/25 text-navy bg-white/60",
                          "hover:bg-navy hover:text-white hover:border-navy transition-all duration-200",
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

            {/* Applications */}
            <motion.section
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12, ease }}
              className="account-glass-panel p-5 sm:p-6 md:p-7"
            >
              <div className="flex items-start sm:items-baseline justify-between gap-3 mb-5">
                <SectionHeader label="Applications" title="My applications" className="mb-0" />
                <Button variant="secondary" size="sm" asChild className="shrink-0">
                  <Link href="/">
                    <Plus className="w-3.5 h-3.5" />
                    New<span className="hidden sm:inline">&nbsp;application</span>
                  </Link>
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : isError ? (
                <ErrorState title="Couldn't load applications" onRetry={() => refetch()} />
              ) : cases.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Start your first visa application"
                  description="Choose a destination and we'll take it from there."
                  className="!bg-white/40 !border-white/70 backdrop-blur-sm py-14"
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

          {/* Sidebar */}
          <aside className="lg:col-span-5 xl:col-span-4">
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.16, ease }}
              className="lg:sticky lg:top-24 space-y-5"
            >
              <CustomerProfile />
              <TravelerProfiles />
              <SupportCard source="account" />
              <Button
                type="button"
                variant="outline"
                className="w-full account-glass-panel border-danger/25 text-danger hover:bg-danger hover:text-white hover:border-danger"
                onClick={logout}
                data-testid="account-logout"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center px-3 sm:px-4 py-1.5 min-w-[3.5rem]">
      <p className="text-ink-muted mb-1 text-[10px] uppercase tracking-widest font-mono">{label}</p>
      <p className="font-display text-xl text-navy leading-none">{value}</p>
    </div>
  );
}

function SectionHeader({ label, title, className }) {
  return (
    <div className={cn("mb-4", className)}>
      <p className="text-[10px] uppercase tracking-[0.26em] text-ink-muted font-mono mb-1.5">{label}</p>
      <h2 className="font-display text-xl sm:text-2xl text-navy">{title}</h2>
    </div>
  );
}

function CaseCard({ caseData: c, index, reduce }) {
  const slaStyle =
    c.sla_status === "overdue"
      ? "danger"
      : c.sla_status === "due_soon"
        ? "warning"
        : c.sla_status === "completed"
          ? "gold"
          : "success";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease }}
    >
      <Card
        variant="glass"
        className="flex items-center gap-3 sm:gap-4 p-4 md:p-5 group hover:border-navy/15 transition-colors"
        data-testid={`account-case-${c.id.slice(0, 6)}`}
      >
        <span className="text-3xl md:text-4xl shrink-0">{c.config_snapshot_json.country_flag}</span>

        <Link href={`/status/${c.id}`} className="flex-1 min-w-0">
          <div className="font-semibold text-ink truncate group-hover:text-navy transition-colors">
            {c.config_snapshot_json.title}
          </div>
          <div className="text-[11px] font-mono uppercase text-ink-muted tracking-widest mt-1">
            Case {formatCaseNumber(c)}
            <span className="hidden sm:inline">
              {" · "}
              {formatInDate(c.created_at, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </Link>

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

        <ArrowRight className="w-4 h-4 text-ink-muted/40 group-hover:text-navy group-hover:translate-x-0.5 transition-all shrink-0 hidden md:block" />
      </Card>
    </motion.div>
  );
}
