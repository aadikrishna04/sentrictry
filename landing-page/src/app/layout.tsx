import React from "react";
import type { Metadata, Viewport } from "next";
import { Crimson_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson-pro",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
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
      style={{ fontSize: "14px" }}
      className={`${crimsonPro.variable} ${playfairDisplay.variable}`}
    >
      <body style={{ fontSize: "14px", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
