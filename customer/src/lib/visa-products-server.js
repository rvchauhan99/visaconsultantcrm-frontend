/**
 * Server-only visa product fetches for metadata, sitemap, and JSON-LD.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function fetchVisaProducts() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/visa-products`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function fetchVisaProduct(productId) {
  if (!productId) return null
  try {
    const res = await fetch(`${BACKEND_URL}/api/visa-products/${productId}`, {
      next: { revalidate: 300 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
