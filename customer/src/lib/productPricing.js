/** Shared product pricing — govt fee incl GST, service fee excl GST. */

export const DEFAULT_GST_PERCENT = 18;

export function computeServiceGst(serviceFee, gstPercent = DEFAULT_GST_PERCENT) {
  const service = Number(serviceFee) || 0;
  const gst = Number(gstPercent) || 0;
  return Math.round(service * gst / 100);
}

export function computeLineTotal({
  govtFee,
  serviceFee,
  gstPercent = DEFAULT_GST_PERCENT,
  headcount = 1,
}) {
  const govt = Number(govtFee) || 0;
  const service = Number(serviceFee) || 0;
  const gst = Number(gstPercent) || 0;
  const serviceWithGst = service * (1 + gst / 100);
  const count = Number(headcount) || 1;
  return Math.round((govt + serviceWithGst) * count);
}

export function computeFeeBreakdown({
  govtFee,
  serviceFee,
  gstPercent = DEFAULT_GST_PERCENT,
  headcount = 1,
} = {}) {
  const govt = Number(govtFee) || 0;
  const service = Number(serviceFee) || 0;
  const pct = Number(gstPercent) || DEFAULT_GST_PERCENT;
  const serviceGst = computeServiceGst(service, pct);
  const total = computeLineTotal({ govtFee: govt, serviceFee: service, gstPercent: pct, headcount });
  return {
    govtFee: govt,
    serviceFee: service,
    serviceGst,
    gstPercent: pct,
    total,
  };
}
