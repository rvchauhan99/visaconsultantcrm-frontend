"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { CatalogSearchProvider } from "@/context/catalog-search";

function isStaleChunkRejection(reason) {
  if (typeof Event !== "undefined" && reason instanceof Event) {
    const target = reason.target;
    const src = target && (target.src || target.href);
    return typeof src === "string" && src.includes("/_next/");
  }
  const message = String(reason?.message || reason || "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(message);
}

export default function Providers({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    const onUnhandled = (event) => {
      if (!isStaleChunkRejection(event.reason)) return;
      // Dev server restarts leave open tabs with stale chunk URLs; recover once.
      const key = "passage:chunk-reload";
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    sessionStorage.removeItem("passage:chunk-reload");
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  return (
    <QueryClientProvider client={client}>
      <CatalogSearchProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </CatalogSearchProvider>
    </QueryClientProvider>
  );
}

