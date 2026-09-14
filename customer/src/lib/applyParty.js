/** Multi-traveler party helpers for the customer apply flow. */

export const APPLY_MAX_TRAVELERS = 6;

export function newTravelerId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function blankTravelerMember(seed = {}) {
  return {
    id: seed.id || newTravelerId(),
    full_name: seed.full_name || "",
    dob: seed.dob || "",
    passport_number: seed.passport_number || "",
    passport_issue_date: seed.passport_issue_date || "",
    passport_expiry_date: seed.passport_expiry_date || "",
    gender: seed.gender || "",
    nationality: seed.nationality || "",
    phone: seed.phone || "",
    email: seed.email || "",
    relationship: seed.relationship || "self",
    field_values: { ...(seed.field_values || {}) },
    document_uploads: Array.isArray(seed.document_uploads) ? [...seed.document_uploads] : [],
  };
}

export function uploadsMapFromArray(list) {
  const um = {};
  ;(list || []).forEach((u) => {
    um[u.doc_key] = {
      file_url: u.file_url,
      filename: u.filename,
      storage_key: u.storage_key || u.key || null,
      size_mb: 0,
    };
  });
  return um;
}

export function uploadsArrayFromMap(uploads) {
  return Object.entries(uploads || {}).map(([doc_key, u]) => ({
    doc_key,
    file_url: u.file_url,
    filename: u.filename,
    storage_key: u.storage_key || u.key || null,
  }));
}

/** Build party from draft API response (legacy singular or travelers[]). */
export function partyFromDraft(draft) {
  if (Array.isArray(draft?.travelers) && draft.travelers.length > 0) {
    return draft.travelers.map((m, i) => {
      const member = blankTravelerMember(m);
      if (i === 0 && (!m.field_values || Object.keys(m.field_values).length === 0)) {
        member.field_values = { ...(draft.field_values || {}) };
      }
      if (i === 0 && (!m.document_uploads || m.document_uploads.length === 0)) {
        member.document_uploads = [...(draft.document_uploads || [])];
      }
      return member;
    });
  }
  const t = draft?.traveler || {};
  return [
    blankTravelerMember({
      ...t,
      field_values: draft?.field_values || {},
      document_uploads: draft?.document_uploads || [],
    }),
  ];
}

export function maskPassport(num) {
  if (!num) return "—";
  const s = String(num);
  if (s.length <= 4) return s;
  return `${"•".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

export function memberDisplayName(m, index) {
  const name = (m?.full_name || "").trim();
  if (name) return name;
  return index === 0 ? "Primary traveler" : `Traveler ${index + 1}`;
}
