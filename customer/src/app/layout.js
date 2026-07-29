import Providers from "@/components/providers";
import CustomerShell from "@/components/layout/customer-shell";
import "./globals.css";

export const metadata = {
  title: "AmaraVisa — Visas without the guesswork",
  description: "Premium visa consultancy for Indian passport holders. Transparent fees, human consultants, on-time filing.",
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
