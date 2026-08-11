/** Maps OCR API fields → traveler / profile form keys. */
export const passportFieldMap = {
  full_name: "full_name",
  passport_number: "passport_number",
  date_of_birth: "dob",
  passport_issue_date: "passport_issue_date",
  passport_expiry_date: "passport_expiry_date",
  gender: "gender",
  nationality: "nationality",
};

/** OCR canonical meta keys → traveler keys for status badges */
export const ocrMetaToTraveler = {
  fullName: "full_name",
  passportNumber: "passport_number",
  dateOfBirth: "dob",
  dateOfIssue: "passport_issue_date",
  dateOfExpiry: "passport_expiry_date",
  gender: "gender",
  nationality: "nationality",
};

export function mapOcrToTraveler(ocrData, prev = {}) {
  return {
    ...prev,
    full_name: ocrData.full_name || prev.full_name || "",
    passport_number: ocrData.passport_number || prev.passport_number || "",
    dob: ocrData.date_of_birth || prev.dob || "",
    passport_issue_date: ocrData.passport_issue_date || prev.passport_issue_date || "",
    passport_expiry_date: ocrData.passport_expiry_date || prev.passport_expiry_date || "",
    gender: ocrData.gender || prev.gender || "",
    nationality: ocrData.nationality || prev.nationality || "",
  };
}

export function buildFieldStatuses(ocrData) {
  const statuses = {};
  const meta = ocrData?.fields || {};
  for (const [canon, travelerKey] of Object.entries(ocrMetaToTraveler)) {
    const f = meta[canon];
    if (f?.status) {
      statuses[travelerKey] = f.status;
    }
  }
  // Flat fallback when meta missing
  if (!Object.keys(meta).length && ocrData) {
    if (ocrData.full_name) statuses.full_name = "verified";
    if (ocrData.passport_number) statuses.passport_number = "verified";
    if (ocrData.date_of_birth) statuses.dob = "verified";
    if (ocrData.passport_expiry_date) statuses.passport_expiry_date = "verified";
    if (ocrData.passport_issue_date) {
      statuses.passport_issue_date =
        (ocrData.ocr_confidence || 0) >= 0.85 ? "high_confidence" : "needs_review";
    }
    if (ocrData.gender) statuses.gender = "verified";
    if (ocrData.nationality) statuses.nationality = "verified";
  }
  return statuses;
}
