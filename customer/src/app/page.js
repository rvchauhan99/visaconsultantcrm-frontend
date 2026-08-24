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
        className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 pt-4 md:pt-6 pb-2"
        aria-labelledby="home-hero-heading"
      >
        <h1
          id="home-hero-heading"
          className="font-display text-2xl sm:text-3xl md:text-4xl text-navy tracking-tight leading-tight max-w-3xl"
        >
          Visas for Indian passport holders — transparent fees, on-time filing
        </h1>
        <p className="mt-3 text-sm sm:text-[15px] text-ink-muted max-w-2xl leading-relaxed">
          Explore destinations, apply online, and track your case with a dedicated AmaraVisa consultant.
          Based in {OFFICE.addressLocality}, {OFFICE.addressRegion} — serving applicants across India.
        </p>
      </section>

      <HomeCatalog />
      <HomeFaqSection />
    </>
  );
}
