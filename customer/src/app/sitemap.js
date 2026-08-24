import { absoluteUrl } from "@/lib/seo"
import { fetchVisaProducts } from "@/lib/visa-products-server"

export default async function sitemap() {
  const products = await fetchVisaProducts()
  const now = new Date()

  const visaEntries = products
    .filter((p) => p?.id)
    .map((p) => ({
      url: absoluteUrl(`/visa/${p.id}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }))

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...visaEntries,
  ]
}
