"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/card";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-5 py-20">
      <ErrorState title="Something went wrong" description={error?.message || "Unexpected error"} onRetry={reset} />
    </div>
  );
}
