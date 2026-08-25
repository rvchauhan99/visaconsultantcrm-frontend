/**
 * SEO / GEO helpers for the customer portal (server-safe).
 */

export const SITE_NAME = "AmaraVisa"
export const SITE_TAGLINE = "Visas without the guesswork"

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  return raw.replace(/\/$/, "")
}

export const OFFICE = {
  legalName: "AmaraVisa India Private Limited",
  streetAddress: "RADHE Times Square, 408, Kudasan",
  addressLocality: "Gandhinagar",
  addressRegion: "Gujarat",
  postalCode: "382421",
  addressCountry: "IN",
  latitude: 23.1564524,
  longitude: 72.6359543,
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@amaravisa.com",
  telephone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-80-0000-0000",
}

export const DEFAULT_DESCRIPTION =
  "Premium visa consultancy for Indian passport holders. Transparent fees, human consultants, and on-time filing with AmaraVisa."

export function absoluteUrl(path = "/") {
  const base = getSiteUrl()
  if (!path || path === "/") return base
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function formatVisaTypeLabel(type = "") {
  const map = { tourist: "Tourist", business: "Business", transit: "Transit", other_general: "General" }
  return map[type] || String(type).replace(/_/g, " ")
}

const ISSUANCE_LABELS = {
  visa_free: "Visa Free",
  visa_on_arrival: "Visa on Arrival",
  e_visa: "e-Visa",
  sticker_visa: "Sticker Visa",
}

export function formatVisaFormatLabel(format = "") {
  return ISSUANCE_LABELS[format] || formatVisaTypeLabel(format)
}

export function visaPageTitle(product) {
  const country = product?.country_name || "Visa"
  const issuance = formatVisaFormatLabel(product?.visa_format || "e_visa")
  const purpose = formatVisaTypeLabel(product?.visa_type)
  return `${country} ${purpose} ${issuance} | ${SITE_NAME}`
}

export function visaPageDescription(product) {
  if (!product) return DEFAULT_DESCRIPTION
  const days = product.processing_time_days
  const country = product.country_name
  const purpose = formatVisaTypeLabel(product.visa_type).toLowerCase()
  const issuance = formatVisaFormatLabel(product.visa_format || "e_visa").toLowerCase()
  return `Apply for a ${country} ${purpose} ${issuance} with ${SITE_NAME}. Transparent fees, dedicated consultant, typical processing ${days} days. For Indian passport holders.`
}

export function buildLocalBusinessJsonLd() {
  const mapsUrl = process.env.NEXT_PUBLIC_OFFICE_MAPS_URL || ""
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${getSiteUrl()}/#organization`,
    name: SITE_NAME,
    legalName: OFFICE.legalName,
    url: getSiteUrl(),
    email: OFFICE.email,
    telephone: OFFICE.telephone,
    image: absoluteUrl("/brand/amaravisa-logo.png"),
    logo: absoluteUrl("/brand/amaravisa-logo.png"),
    description: DEFAULT_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      streetAddress: OFFICE.streetAddress,
      addressLocality: OFFICE.addressLocality,
      addressRegion: OFFICE.addressRegion,
      postalCode: OFFICE.postalCode,
      addressCountry: OFFICE.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: OFFICE.latitude,
      longitude: OFFICE.longitude,
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    sameAs: mapsUrl ? [mapsUrl] : [],
  }
}

export function buildHomeFaqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  }
}

export function buildVisaServiceJsonLd(product) {
  if (!product) return null
  const url = absoluteUrl(`/visa/${product.id}`)
  const govt = Number(product.fees?.govt_fee || 0)
  const service = Number(product.fees?.service_fee || 0)
  const total = govt + service
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: product.title || `${product.country_name} visa`,
    description: visaPageDescription(product),
    url,
    provider: {
      "@type": "TravelAgency",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    serviceType: `${formatVisaFormatLabel(product.visa_format || "e_visa")} (${formatVisaTypeLabel(product.visa_type)})`,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: String(total),
      url,
      availability: "https://schema.org/InStock",
    },
  }
}

export function buildBreadcrumbJsonLd(product) {
  if (!product) return null
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getSiteUrl(),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.country_name || product.title,
        item: absoluteUrl(`/visa/${product.id}`),
      },
    ],
  }
}

export const HOME_FAQS = [
  {
    question: "Who can apply for a visa with AmaraVisa?",
    answer:
      "AmaraVisa helps Indian passport holders plan, apply, and track tourist, business, and other visas with transparent fees and a dedicated human consultant.",
  },
  {
    question: "Where is the AmaraVisa office located?",
    answer:
      "AmaraVisa India Private Limited is at RADHE Times Square, 408, Kudasan, Gandhinagar, Gujarat 382421. Use Get directions on the site to open Google Maps.",
  },
  {
    question: "What is included in the AmaraVisa service fee?",
    answer:
      "Your application includes document guidance, consultant review, and embassy filing support. Government fees are shown separately before you pay.",
  },
  {
    question: "How do I track my visa application?",
    answer:
      "After you apply and sign in, open My applications to see live status, document requests, and payment receipts for each case.",
  },
]

/** Popular footer destinations — matched to live catalog by country_name. */
export const POPULAR_DESTINATION_NAMES = [
  "Singapore",
  "United Arab Emirates",
  "United Kingdom",
  "Australia",
  "Thailand",
]
