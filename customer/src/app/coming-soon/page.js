import Link from "next/link";
import Stamp from "@/components/ui/stamp";
import { Button } from "@/components/ui/button";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";

export const metadata = {
  title: "Coming soon — AmaraVisa",
  description: "The AmaraVisa mobile app is coming soon. Apply for visas online in the meantime.",
};

export default function ComingSoonPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-20 md:py-28 text-center">
      <div className="flex justify-center mb-8">
        <AmaraVisaLogo size="lg" />
      </div>
      <Stamp tone="gold" size="sm" className="mx-auto mb-5">
        Mobile app
      </Stamp>
      <h1 className="font-display text-3xl md:text-4xl text-navy tracking-[-0.02em] mb-3">
        Coming soon
      </h1>
      <p className="text-ink-muted text-base md:text-lg leading-relaxed max-w-md mx-auto mb-8">
        The AmaraVisa app is on the way. You can still explore destinations and apply for visas online today.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild variant="solid" size="lg">
          <Link href="/">Explore visas</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/auth">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
