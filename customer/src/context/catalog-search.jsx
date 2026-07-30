"use client";

import { createContext, useContext, useMemo, useState } from "react";

const CatalogSearchContext = createContext(null);

export function CatalogSearchProvider({ children }) {
  const [q, setQ] = useState("");

  const value = useMemo(() => ({ q, setQ }), [q]);

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
