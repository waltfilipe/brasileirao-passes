import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/i18n/context";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "xP & xPV Analysis — Brasileirão",
  description: "Pass analysis of the top 15 players per position in Brasileirão 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        <LocaleProvider>
          <SiteHeader />
          <main>{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
