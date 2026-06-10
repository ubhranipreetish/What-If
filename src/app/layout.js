import { Inter } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/nav/SiteChrome";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "CounterPlay — The Alternate Reality Engine",
  description:
    "Test What-If scenarios in historical sports matches. Powered by a 10,000-run Monte Carlo probability engine.",
};

// Next.js viewport config. `viewportFit: "cover"` lets the UI extend under the
// notch/home-indicator so our `env(safe-area-inset-*)` paddings can take over.
// We intentionally do NOT disable user scaling (no maximumScale/userScalable) —
// pinch-zoom must stay available for accessibility.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#02050c",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased min-h-dvh`}>
        <SiteChrome />
        {children}
      </body>
    </html>
  );
}
