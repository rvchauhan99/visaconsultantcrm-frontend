"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/card";

function errorMessage(error) {
  if (!error) return "Unexpected error";
  if (typeof error === "string") {
    return error === "[object Event]"
      ? "A resource failed to load. Try refreshing the page."
      : error;
  }
  const message = error?.message;
  if (typeof message === "string" && message) {
    return message === "[object Event]"
      ? "A resource failed to load. Try refreshing the page."
      : message;
  }
  if (typeof error?.digest === "string") return error.digest;
  return "Something went wrong loading this page.";
}

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-5 py-20">
      <ErrorState
        title="Something went wrong"
        description={errorMessage(error)}
        onRetry={() => reset()}
      />
    </div>
  );
}
