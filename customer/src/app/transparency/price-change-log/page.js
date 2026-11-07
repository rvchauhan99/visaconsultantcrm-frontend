import { Suspense } from "react";
import PriceChangeLogInner from "./price-change-log-inner";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: "Fee change history",
  description:
    "Every amaravisa visa fee change — with time, product, and reason. Transparent government and service fees.",
  alternates: {
    canonical: absoluteUrl("/transparency/price-change-log"),
  },
  openGraph: {
    title: `Fee change history | ${SITE_NAME}`,
    description:
      "Every fee ever changed is right here — with time and reason. You never have to guess.",
    url: absoluteUrl("/transparency/price-change-log"),
  },
};

export default function PriceChangeLogPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-16 text-sm text-ink-muted">
          Loading fee history…
        </div>
      }
    >
      <PriceChangeLogInner />
    </Suspense>
  );
}
