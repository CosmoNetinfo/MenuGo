import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BRAND_CONFIG } from "@/config/brand";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.name} · Vetrina e ordini online per ristoranti`,
  description: `${BRAND_CONFIG.tagline}. Piattaforma multi-locale, PWA installabile con personalizzazione completa di grafica, menu e regole orarie.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-50 text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}
