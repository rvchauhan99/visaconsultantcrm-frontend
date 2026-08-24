import { getSiteUrl } from "@/lib/seo"

export default function robots() {
  const base = getSiteUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/account/", "/apply/", "/status/", "/auth", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
