import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sentric | Browser Agent Security",
  description: "Enterprise-grade adversarial testing platform for AI agents.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      style={{ fontSize: "15px" }}
      className={`${manrope.variable} ${playfairDisplay.variable}`}
    >
      <body style={{ fontSize: "15px", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
