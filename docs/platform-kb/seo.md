# Customer SEO & GEO

Public customer Next.js site only (not CRM).

## What we ship

| Layer | Location |
|-------|----------|
| Metadata / OG | `customer/src/app/layout.js`, visa `generateMetadata` |
| Helpers | `customer/src/lib/seo.js` |
| Server product fetch | `customer/src/lib/visa-products-server.js` |
| robots / sitemap | `customer/src/app/robots.js`, `sitemap.js` |
| JSON-LD | LocalBusiness + FAQ on `/`; Service + Breadcrumb on `/visa/[id]` |
| FAQs | `HomeFaqSection` + `HOME_FAQS` |
| llms.txt | `customer/public/llms.txt` |
| Private noindex | layouts under `auth`, `account`, `apply`, `status` |

## Env

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (no trailing slash), e.g. `https://www.amaravisa.com` |
| `NEXT_PUBLIC_OFFICE_MAPS_URL` | Local `sameAs` + Get directions |
| `NEXT_PUBLIC_SUPPORT_*` | NAP phone/email |

## Off-site checklist (marketing)

1. Google Search Console → add property → submit `/sitemap.xml`
2. Google Business Profile → match NAP in `OFFICE` / footer
3. Confirm GA4 Realtime (`G-TJBJQ9HER2`)

## Verify

- View source: title, description, `application/ld+json`
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`
- Auth/account/apply/status not indexed
