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
  experimental: {
    // Keep Turbopack's dev cache in-memory instead of writing and compacting a
    // multi-gigabyte disk cache on drive G: (which triggered 40s compactions).
    turbopackFileSystemCacheForDev: false,
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "framer-motion",
      "cmdk",
      "sonner",
      "vaul",
      "embla-carousel-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
    ],
  },
  serverExternalPackages: [
    "@anthropic-ai/sdk",
    "write-excel-file",
  ],
};

// Bangla and English (src/i18n/request.ts). No locale in the URL — the
// language is a cookie, so every route keeps its path.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
