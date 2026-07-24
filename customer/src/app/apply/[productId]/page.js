"use client";

import { Suspense } from "react";
import ApplyPageInner from "./apply-inner";
import { Skeleton } from "@/components/ui/card";
import RequireCustomer from "@/components/auth/require-customer";

export default function ApplyPage() {
  return (
    <RequireCustomer>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto px-5 py-10 space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-80" />
          </div>
        }
      >
        <ApplyPageInner />
      </Suspense>
    </RequireCustomer>
  );
}
