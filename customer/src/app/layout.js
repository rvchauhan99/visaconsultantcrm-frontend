import Providers from "@/components/providers";
import CustomerShell from "@/components/layout/customer-shell";
import "./globals.css";

export const metadata = {
  title: "AmaraVisa — Visas without the guesswork",
  description: "Premium visa consultancy for Indian passport holders. Transparent fees, human consultants, on-time filing.",
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
        <Providers>
          <CustomerShell>{children}</CustomerShell>
        </Providers>
      </body>
    </html>
  );
}
