"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCustomer, setNextPath } from "@/lib/session";

/** Client auth gate for protected customer routes. */
export default function RequireCustomer({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!isCustomer()) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      setNextPath(`${pathname}${search}`);
      router.replace("/auth");
      setOk(false);
    } else {
      setOk(true);
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return <div className="max-w-3xl mx-auto p-10 text-ink-muted">Checking session…</div>;
  }
  if (!ok) return null;
  return children;
}
