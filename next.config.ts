import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Lets `NEXT_DIST_DIR=.next-verify yarn build` run without clobbering the
  // .next a running `yarn dev` is serving from. Defaults to the usual .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

// Bangla and English (src/i18n/request.ts). No locale in the URL — the
// language is a cookie, so every route keeps its path.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
