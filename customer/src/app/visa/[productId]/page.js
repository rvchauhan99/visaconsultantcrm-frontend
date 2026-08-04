"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, CheckCircle2, FileText, Shield, ArrowRight, Clock, HeadphonesIcon } from "lucide-react";
import Stamp from "@/components/ui/stamp";
import { Card, ErrorState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVisaProduct } from "@/hooks/customer-api";
import { isCustomer, setNextPath } from "@/lib/session";
import { INR, formatVisaType, formatValidity, cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";

export default function VisaDetailPage() {
  const { productId } = useParams();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { data: schema, isLoading, isError, error, refetch } = useVisaProduct(productId);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error?.response?.status === 404) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <Stamp tone="muted" size="lg" className="mx-auto mb-6">No longer available</Stamp>
        <h1 className="font-display text-3xl text-navy mb-3">This visa is no longer offered</h1>
        <p className="text-ink-muted mb-6">Please choose from our current selection.</p>
        <Link href="/" className="text-teal underline" data-testid="back-to-catalog">Back to destinations</Link>
      </div>
    );
  }

  if (isError || !schema) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16">
        <ErrorState title="Couldn't load this visa" onRetry={() => refetch()} />
      </div>
    );
  }

  const total = (schema.fees?.govt_fee || 0) + (schema.fees?.service_fee || 0);

  const startApply = () => {
    track("apply_start_click", { product_id: productId });
    if (!isCustomer()) {
      setNextPath(`/apply/${productId}`);
      router.push("/auth");
    } else {
      router.push(`/apply/${productId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 py-8 md:py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-navy mb-6 transition-colors" data-testid="detail-back">
        ← All destinations
      </Link>

      {/* Hero header */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 mb-8"
      >
        <span className="text-5xl leading-none">{schema.country_flag}</span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted px-2.5 py-1 rounded-full bg-surface-muted border border-border">
              {formatVisaType(schema.visa_type)}
            </span>
            <Stamp tone="gold" size="sm">Guaranteed on time</Stamp>
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-navy leading-tight">{schema.title}</h1>
          <p className="text-ink-muted mt-2 max-w-2xl">
            For Indian passport holders · {schema.country_name}
          </p>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
        <div className="md:col-span-2 space-y-8">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Processing" value={`${schema.processing_time_days} days`} icon={<Clock className="w-4 h-4" />} />
            <Metric label="Validity" value={formatValidity(schema.validity_days)} icon={<Shield className="w-4 h-4" />} />
            <Metric label="Visa type" value={formatVisaType(schema.visa_type)} icon={<FileText className="w-4 h-4" />} />
          </div>

          {/* Banner */}
          {schema.banner_image_url && (
            <div className="relative rounded-2xl overflow-hidden shadow-[var(--shadow-card)] aspect-[21/9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={schema.banner_image_url} alt={schema.country_name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}

          {/* Documents checklist */}
          <div>
            <h2 className="font-display text-2xl text-navy mb-1">What you&apos;ll need</h2>
            <p className="text-sm text-ink-muted mb-5">Prepare these documents before starting your application</p>
            <ul className="space-y-2.5">
              {(schema.documents || []).map((d) => (
                <li key={d.doc_key} className="flex items-start gap-3 p-4 bg-white border border-border rounded-xl hover:border-navy/15 transition-colors">
                  <CheckCircle2 className={cn("w-5 h-5 shrink-0 mt-0.5", d.required ? "text-teal" : "text-ink-muted")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink">{d.name}</span>
                      {!d.required && (
                        <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted px-2 py-0.5 rounded-full bg-surface-muted">Optional</span>
                      )}
                    </div>
                    {d.description && <p className="text-sm text-ink-muted mt-1">{d.description}</p>}
                    <p className="text-xs text-ink-muted mt-1.5 font-mono">
                      {(d.formats || []).join(", ").toUpperCase()} · max {d.max_size_mb}MB
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust note */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-teal/5 border border-teal/15">
            <HeadphonesIcon className="w-5 h-5 text-teal shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-navy text-sm">Dedicated consultant included</div>
              <p className="text-sm text-ink-muted mt-1">
                A real person reviews your documents and files your application at the {schema.country_name} embassy. You&apos;ll hear from us within 24 hours of applying.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky sidebar */}
        <aside className="md:sticky md:top-24 md:self-start">
          <Card className="p-6 shadow-[var(--shadow-premium)] border-navy/10">
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">Total fees</div>
            <div className="font-display text-4xl text-navy mb-4">{INR.format(total)}</div>

            <div className="space-y-2.5 py-4 border-y border-border text-sm">
              <FeeRow label="Government fee (incl. GST)" amount={schema.fees?.govt_fee} />
              <FeeRow label="Service fee (excl. GST)" amount={schema.fees?.service_fee} />
            </div>

            <div className="flex items-center gap-2 py-4 text-xs text-ink-muted">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Estimated delivery in {schema.processing_time_days} business days
            </div>

            <Button onClick={startApply} data-testid="apply-now" className="w-full gap-2">
              Apply now
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="mt-4 flex justify-center">
              <Stamp tone="gold" size="sm">On-time guarantee</Stamp>
            </div>
            <p className="text-xs text-ink-muted mt-3 leading-relaxed text-center">
              No hidden fees. Pay securely via Razorpay after document review.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }) {
  return (
    <Card className="p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 text-ink-muted text-[10px] uppercase font-mono tracking-widest mb-1.5">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-navy capitalize text-sm">{value}</div>
    </Card>
  );
}

function FeeRow({ label, amount }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="font-mono text-ink font-medium">{INR.format(amount || 0)}</span>
    </div>
  );
}
