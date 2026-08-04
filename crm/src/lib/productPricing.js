/** Shared product pricing — govt fee incl GST, service fee excl GST. */

export const DEFAULT_GST_PERCENT = 18;

export const FEE_LABELS = {
  govt: "Government fee (incl. GST)",
  service: "Service fee (excl. GST)",
};

export const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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

export function snapshotFeesFromProduct(product) {
  return {
    govt_fee_per_person: product?.fees?.govt_fee ?? 0,
    service_fee_per_person: product?.fees?.service_fee ?? 0,
  };
}

export function computeVisaHeadcount(details) {
  const adults = Number(details?.adults) || 0;
  const children = Number(details?.children) || 0;
  const infants = Number(details?.infants) || 0;
  return adults + children + infants || 1;
}

export function computeVisaTotal(details) {
  return computeLineTotal({
    govtFee: details?.govt_fee_per_person,
    serviceFee: details?.service_fee_per_person,
    gstPercent: details?.gst_percent ?? DEFAULT_GST_PERCENT,
    headcount: computeVisaHeadcount(details),
  });
}

export function computePassportTotal(details) {
  return computeLineTotal({
    govtFee: details?.govt_fee_per_person,
    serviceFee: details?.service_fee_per_person,
    gstPercent: details?.gst_percent ?? DEFAULT_GST_PERCENT,
    headcount: Number(details?.applicants_count) || 1,
  });
}

export function formatFeeHint(product) {
  const govt = product?.fees?.govt_fee;
  const svc = product?.fees?.service_fee;
  if (govt == null && svc == null) return "";
  const parts = [];
  if (govt != null) parts.push(INR.format(govt));
  if (svc != null) parts.push(`${INR.format(svc)} svc`);
  return parts.length ? ` · ${parts.join(" + ")}` : "";
}
