import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: BRAND_INFO.name,
    template: `%s — ${BRAND_INFO.name}`,
  },
  description: BRAND_INFO.tagline,
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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ReduxProvider>
          <PublishedPathsProvider paths={publishedPaths}>
            <Providers>{children}</Providers>
          </PublishedPathsProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
