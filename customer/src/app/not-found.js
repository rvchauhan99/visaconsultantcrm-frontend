import Link from "next/link";
import Stamp from "@/components/ui/stamp";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-24 text-center">
      <Stamp tone="muted" size="lg" className="mx-auto mb-6">
        404
      </Stamp>
      <h1 className="font-display text-3xl text-navy mb-3">Page not found</h1>
      <p className="text-ink-muted mb-6">That route doesn&apos;t exist in the customer portal.</p>
      <Link href="/" className="text-teal underline">
        Back to visas
      </Link>
    </div>
  );
}
