import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Adresse für Vorschaubilder: auf Vercel immer die eigene Domain, lokal localhost.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL ? "https://abgleich.bkstechnologies.de" : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Abgleich (Demo)", template: "%s · Abgleich (Demo)" },
  description:
    "Dashboard für Datensynchronisation zwischen Shop, ERP, CRM und Buchhaltung: Pipelines, Verlauf, Konfliktlösung. Demo von BKS Technologies mit erfundenen Daten.",
  openGraph: { type: "website", locale: "de_DE", siteName: "Abgleich (Demo)" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
