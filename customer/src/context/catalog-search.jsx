"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CatalogSearchContext = createContext(null);

export function CatalogSearchProvider({ children }) {
  const [q, setQ] = useState("");
  const [visaFormat, setVisaFormat] = useState("any");
  const [delivery, setDelivery] = useState("any");
  const [documentsProfile, setDocumentsProfile] = useState("any");
  const [travelDate, setTravelDate] = useState("");
  const [headerCompact, setHeaderCompact] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const clearFilters = useCallback(() => {
    setQ("");
    setVisaFormat("any");
    setDelivery("any");
    setDocumentsProfile("any");
    setTravelDate("");
  }, []);

  const hasFilters = Boolean(
    q ||
      visaFormat !== "any" ||
      delivery !== "any" ||
      documentsProfile !== "any" ||
      travelDate,
  );

  const value = useMemo(
    () => ({
      q,
      setQ,
      visaFormat,
      setVisaFormat,
      delivery,
      setDelivery,
      documentsProfile,
      setDocumentsProfile,
      travelDate,
      setTravelDate,
      clearFilters,
      hasFilters,
      headerCompact,
      setHeaderCompact,
      searchExpanded,
      setSearchExpanded,
    }),
    [
      q,
      visaFormat,
      delivery,
      documentsProfile,
      travelDate,
      clearFilters,
      hasFilters,
      headerCompact,
      searchExpanded,
    ],
  );

  return (
    <CatalogSearchContext.Provider value={value}>
      {children}
    </CatalogSearchContext.Provider>
  );
}

export function useCatalogSearch() {
  const ctx = useContext(CatalogSearchContext);
  if (!ctx) {
    throw new Error("useCatalogSearch must be used within CatalogSearchProvider");
  }
  return ctx;
}
