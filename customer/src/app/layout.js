import Providers from "@/components/providers";
import CustomerShell from "@/components/layout/customer-shell";
import GoogleAnalytics from "@/components/analytics/google-analytics";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  getSiteUrl,
} from "@/lib/seo";
import "./globals.css";

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "visa",
    "visa consultancy",
    "Indian passport",
    "AmaraVisa",
    "Gandhinagar",
    "tourist visa",
    "business visa",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/brand/amaravisa-logo.png",
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: ["/brand/amaravisa-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: absoluteUrl("/"),
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GoogleAnalytics />
        <Providers>
          <CustomerShell>{children}</CustomerShell>
        </Providers>
      </body>
    </html>
  );
}
