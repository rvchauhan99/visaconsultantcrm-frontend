"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CatalogSearchContext = createContext(null);

export function CatalogSearchProvider({ children }) {
  const [q, setQ] = useState("");
  const [visaType, setVisaType] = useState("");
  const [delivery, setDelivery] = useState("any");
  const [complexity, setComplexity] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [headerCompact, setHeaderCompact] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const clearFilters = useCallback(() => {
    setQ("");
    setVisaType("");
    setDelivery("any");
    setComplexity("");
    setTravelDate("");
  }, []);

  const hasFilters = Boolean(q || visaType || delivery !== "any" || complexity || travelDate);

  const value = useMemo(
    () => ({
      q,
      setQ,
      visaType,
      setVisaType,
      delivery,
      setDelivery,
      complexity,
      setComplexity,
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
      visaType,
      delivery,
      complexity,
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
