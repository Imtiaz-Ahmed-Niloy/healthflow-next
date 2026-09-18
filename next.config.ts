import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Lets `NEXT_DIST_DIR=.next-verify yarn build` run without clobbering the
  // .next a running `yarn dev` is serving from. Defaults to the usual .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // `yarn dev` serves its scripts only to localhost unless told otherwise, so
  // a phone opening the LAN address got the HTML with no JavaScript: nothing
  // hydrated, and every fade-in section stayed invisible. Dev only.
  allowedDevOrigins: ["192.168.10.29", "192.168.*.*"],
};

// Bangla and English (src/i18n/request.ts). No locale in the URL — the
// language is a cookie, so every route keeps its path.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
