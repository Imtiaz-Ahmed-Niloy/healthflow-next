import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Hind_Siliguri, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import Providers from "@/components/providers";
import ReduxProvider from "@/redux/provider";
import { PublishedPathsProvider } from "@/components/site/PublishedPages";
import { getPublishedPaths } from "@/lib/cms/pages";

import { BRAND_INFO } from "@/constants/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The site's type, served from our own origin by next/font. It used to be a
 * Google Fonts @import at the top of globals.css, which the build dropped:
 * Inter never loaded, and every screen was set in the visitor's system font.
 *
 * Hind Siliguri draws the Bangla — Inter has no Bengali letters. It comes
 * second in every font stack (--font-bangla), so it only ever draws Bangla
 * and English stays Inter. Without it Windows used Nirmala UI or Vrinda, which
 * set the visarga in "ডাঃ" small and adrift.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND_INFO.name,
    template: `%s — ${BRAND_INFO.name}`,
  },
  description: BRAND_INFO.tagline,
};

// The site has one, light, theme. Saying so stops a phone browser's own dark
// mode (Chrome's auto-dark, Samsung Internet) from repainting the pale
// sections dark.
export const viewport: Viewport = {
  colorScheme: "only light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Which public pages are published, so the nav and footer can drop links to
  // the ones a super admin has unpublished. Cached for 60s, so this does not
  // make every route in the app dynamic.
  const publishedPaths = await getPublishedPaths();
  // Bangla or English, from the language cookie (src/i18n/request.ts).
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      // globals.css scrolls smoothly for in-page links. This keeps page-to-page
      // navigation an instant jump to the top, which Next.js 16 no longer does
      // on its own.
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Hands the language and its messages to every client screen. */}
        <NextIntlClientProvider>
          <ReduxProvider>
            <PublishedPathsProvider paths={publishedPaths}>
              <Providers>{children}</Providers>
            </PublishedPathsProvider>
          </ReduxProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
