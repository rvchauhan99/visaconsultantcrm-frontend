import HomeCatalog from "./home-inner";
import JsonLd from "@/components/seo/json-ld";
import HomeFaqSection from "@/components/seo/home-faq-section";
import {
  DEFAULT_DESCRIPTION,
  HOME_FAQS,
  OFFICE,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  buildHomeFaqJsonLd,
  buildLocalBusinessJsonLd,
} from "@/lib/seo";

export const metadata = {
  title: {
    absolute: `${SITE_NAME} — ${SITE_TAGLINE}`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildLocalBusinessJsonLd()} />
      <JsonLd data={buildHomeFaqJsonLd(HOME_FAQS)} />

      <section
        className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 pt-2 pb-1 md:pt-3 md:pb-2"
        aria-labelledby="home-hero-heading"
      >
        <div className="flex flex-col lg:flex-row lg:items-baseline gap-1 lg:gap-3">
          <h1
            id="home-hero-heading"
            className="font-display text-lg md:text-xl text-navy font-semibold tracking-tight shrink-0"
          >
            Visas for Indian passport holders <span className="font-normal opacity-85">— transparent fees, on-time filing.</span>
          </h1>
          <p className="text-[13px] md:text-sm text-ink-muted truncate">
            Explore destinations, apply online, and track your case. Based in {OFFICE.addressLocality}, {OFFICE.addressRegion} — serving India.
          </p>
        </div>
      </section>

      <HomeCatalog />
      <HomeFaqSection />
    </>
  );
}
