"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, CheckCircle2, FileText, Shield, ArrowRight, Clock, HeadphonesIcon } from "lucide-react";
import Stamp from "@/components/ui/stamp";
import { Card, ErrorState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVisaProduct } from "@/hooks/customer-api";
import { isCustomer, setNextPath } from "@/lib/session";
import { INR, formatVisaType, formatValidity, cn } from "@/lib/utils";
import { computeFeeBreakdown } from "@/lib/productPricing";
import { track } from "@/lib/telemetry";
import {
  activeVariants,
  entryTypeLabel,
  groupVariantsByValidity,
  isMultiSku,
  pricePerYearLabel,
  variantUnitTotal,
} from "@/lib/visa-variants";

export default function VisaDetailInner({ initialProduct = null }) {
  const { productId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const { data: schema, isLoading, isError, error, refetch } = useVisaProduct(productId);
  const product = schema || initialProduct;

  const variants = useMemo(() => activeVariants(product), [product]);
  const multi = isMultiSku(product);
  const groups = useMemo(() => groupVariantsByValidity(variants), [variants]);

  const initialVariantId =
    searchParams.get("variant") ||
    product?.variant_id ||
    variants.find((v) => v.is_default)?.id ||
    variants[0]?.id ||
    null;

  const [selectedId, setSelectedId] = useState(initialVariantId);

  useEffect(() => {
    if (!variants.length) return;
    const stillValid = variants.some((v) => v.id === selectedId);
    if (!stillValid) {
      setSelectedId(variants.find((v) => v.is_default)?.id || variants[0].id);
    }
  }, [variants, selectedId]);

  if (isLoading && !product) {
    return (
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error?.response?.status === 404 && !product) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <Stamp tone="muted" size="lg" className="mx-auto mb-6">No longer available</Stamp>
        <h1 className="font-display text-3xl text-navy mb-3">This visa is no longer offered</h1>
        <p className="text-ink-muted mb-6">Please choose from our current selection.</p>
        <Link href="/" className="text-teal underline" data-testid="back-to-catalog">Back to destinations</Link>
      </div>
    );
  }

  if ((isError && !product) || !product) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16">
        <ErrorState title="Couldn't load this visa" onRetry={() => refetch()} />
      </div>
    );
  }

  const selected =
    variants.find((v) => v.id === selectedId) ||
    variants.find((v) => v.is_default) ||
    variants[0] ||
    null;

  const displayValidity = selected?.validity_days ?? product.validity_days;
  const displayProcessing = selected?.processing_time_days ?? product.processing_time_days;
  const displayMaxStay = selected?.max_stay_days;
  const displayEntry = selected?.entry_type;

  const feeBreakdown = computeFeeBreakdown({
    govtFee: selected?.fees?.govt_fee ?? product.fees?.govt_fee,
    serviceFee: selected?.fees?.service_fee ?? product.fees?.service_fee,
  });

  const startApply = () => {
    track("apply_start_click", { product_id: productId, variant_id: selected?.id });
    const qs = selected?.id ? `?variant=${encodeURIComponent(selected.id)}` : "";
    const path = `/apply/${productId}${qs}`;
    if (!isCustomer()) {
      setNextPath(path);
      router.push("/auth");
    } else {
      router.push(path);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 py-8 md:py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-navy mb-6 transition-colors" data-testid="detail-back">
        ← All destinations
      </Link>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 mb-8"
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted px-2.5 py-1 rounded-full bg-surface-muted border border-border">
              {formatVisaType(product)}
            </span>
            <Stamp tone="gold" size="sm">Guaranteed on time</Stamp>
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-navy leading-tight">{product.title}</h1>
          <p className="text-ink-muted mt-2 max-w-2xl">
            For Indian passport holders · {product.country_name}. Typical processing{" "}
            {displayProcessing} days with dedicated consultant review and transparent fees.
          </p>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
        <div className="md:col-span-2 space-y-8">
          {multi ? (
            <div data-testid="visa-variant-picker">
              <h2 className="font-display text-2xl text-navy mb-1">Choose your visa option</h2>
              <p className="text-sm text-ink-muted mb-4">Validity and processing affect the fee</p>
              <div className="space-y-3">
                {groups.map((group) => {
                  const selectedInGroup = group.options.some((o) => o.id === selected?.id);
                  const shown = selectedInGroup
                    ? group.options.find((o) => o.id === selected?.id)
                    : group.options[0];
                  const perYear = pricePerYearLabel(shown);
                  return (
                    <div
                      key={group.key}
                      role="button"
                      tabIndex={0}
                      data-testid={`variant-group-${group.key}`}
                      onClick={() => setSelectedId(shown.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(shown.id);
                        }
                      }}
                      className={cn(
                        "w-full text-left rounded-2xl border p-4 transition-colors cursor-pointer",
                        selectedInGroup ? "border-navy bg-navy/5 shadow-sm" : "border-border bg-white hover:border-navy/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-navy">{group.label}</div>
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-ink-muted">
                            <span>Valid for <strong className="text-ink">{formatValidity(group.validity_days)}</strong></span>
                            {group.max_stay_days != null ? (
                              <span>Max stay <strong className="text-ink">{formatValidity(group.max_stay_days)}</strong></span>
                            ) : null}
                            <span>Entry <strong className="text-ink">{entryTypeLabel(group.entry_type)}</strong></span>
                            <span>Visa in <strong className="text-ink">{shown.processing_time_days} days</strong></span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display text-xl text-navy">{INR.format(variantUnitTotal(shown))}</div>
                          {perYear ? (
                            <div className="text-[11px] text-ink-muted">{INR.format(perYear)} / year</div>
                          ) : null}
                        </div>
                      </div>
                      {group.options.length > 1 ? (
                        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          {group.options.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              data-testid={`variant-opt-${opt.id}`}
                              onClick={() => setSelectedId(opt.id)}
                              className={cn(
                                "text-xs px-3 py-1.5 rounded-full border",
                                selected?.id === opt.id
                                  ? "bg-navy text-white border-navy"
                                  : "bg-white border-border text-ink-muted hover:border-navy/40"
                              )}
                            >
                              Visa in {opt.processing_time_days} days · {INR.format(variantUnitTotal(opt))}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Processing" value={`${displayProcessing} days`} icon={<Clock className="w-4 h-4" />} />
              <Metric label="Validity" value={formatValidity(displayValidity)} icon={<Shield className="w-4 h-4" />} />
              <Metric label="Visa type" value={formatVisaType(product)} icon={<FileText className="w-4 h-4" />} />
            </div>
          )}

          {multi ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Processing" value={`${displayProcessing} days`} icon={<Clock className="w-4 h-4" />} />
              <Metric label="Validity" value={formatValidity(displayValidity)} icon={<Shield className="w-4 h-4" />} />
              {displayMaxStay != null ? (
                <Metric label="Max stay" value={formatValidity(displayMaxStay)} icon={<Calendar className="w-4 h-4" />} />
              ) : null}
              {displayEntry ? (
                <Metric label="Entry" value={entryTypeLabel(displayEntry)} icon={<FileText className="w-4 h-4" />} />
              ) : null}
            </div>
          ) : null}

          {product.banner_image_url && (
            <div className="relative rounded-2xl overflow-hidden shadow-[var(--shadow-card)] aspect-[21/9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.banner_image_url} alt={`${product.country_name} visa`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}

          <div>
            <h2 className="font-display text-2xl text-navy mb-1">What you&apos;ll need</h2>
            <p className="text-sm text-ink-muted mb-5">Prepare these documents before starting your application</p>
            <ul className="space-y-2.5">
              {(product.documents || []).map((d) => (
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

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-teal/5 border border-teal/15">
            <HeadphonesIcon className="w-5 h-5 text-teal shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-navy text-sm">Dedicated consultant included</div>
              <p className="text-sm text-ink-muted mt-1">
                A real person reviews your documents and files your application at the {product.country_name} embassy. You&apos;ll hear from us within 24 hours of applying.
              </p>
            </div>
          </div>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <Card className="p-6 shadow-[var(--shadow-premium)] border-navy/10">
            <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">Total fees</div>
            <div className="font-display text-4xl text-navy mb-4" data-testid="detail-total-fee">{INR.format(feeBreakdown.total)}</div>

            <div className="space-y-2.5 py-4 border-y border-border text-sm">
              <FeeRow label="Government fee (incl. GST)" amount={feeBreakdown.govtFee} />
              <FeeRow label="Service fee (excl. GST)" amount={feeBreakdown.serviceFee} />
              <FeeRow label={`GST on service (${feeBreakdown.gstPercent}%)`} amount={feeBreakdown.serviceGst} />
            </div>

            {multi && selected ? (
              <div className="py-3 text-xs text-ink-muted" data-testid="detail-selected-variant">
                Selected: <span className="text-ink font-medium">{selected.label}</span>
              </div>
            ) : null}

            <div className="flex items-center gap-2 py-4 text-xs text-ink-muted">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Estimated delivery in {displayProcessing} business days
            </div>

            <Button onClick={startApply} data-testid="apply-now" className="w-full gap-2">
              Apply now
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="mt-4 flex justify-center">
              <Stamp tone="gold" size="sm">On-time guarantee</Stamp>
            </div>
            <p className="text-xs text-ink-muted mt-3 leading-relaxed text-center">
              No hidden fees. Pay securely after document review.
            </p>
            {product?.country_code ? (
              <p className="text-xs text-center mt-3">
                <Link
                  href={`/transparency/price-change-log?search=${encodeURIComponent(product.country_code)}`}
                  className="text-navy underline-offset-2 hover:underline"
                  data-testid="visa-fee-history-link"
                >
                  Fee change history
                </Link>
              </p>
            ) : null}
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
      <div className="font-semibold text-navy text-sm">{value}</div>
    </Card>
  );
}

function FeeRow({ label, amount }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="font-mono">{INR.format(amount || 0)}</span>
    </div>
  );
}
