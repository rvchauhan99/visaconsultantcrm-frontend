export const queryKeys = {
  visaProducts: (params) => ["visa-products", params],
  visaProduct: (id) => ["visa-product", id],
  me: ["customers", "me"],
  notifications: ["customers", "me", "notifications"],
  travelers: ["customers", "me", "traveler-profiles"],
  traveler: (id) => ["customers", "me", "traveler-profiles", id],
  vaultByKey: (docKey) => ["customers", "me", "document-vault", docKey],
  myCases: ["cases", "my"],
  drafts: ["cases", "drafts"],
  draft: (id) => ["cases", "drafts", id],
  caseStatus: (id) => ["cases", id, "status"],
};
