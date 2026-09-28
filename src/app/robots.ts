import type { MetadataRoute } from "next";

/**
 * /robots.txt — the public site is crawlable; the panels, the account screens
 * and the API are not. Panels are behind sign-in anyway (src/proxy.ts), so this
 * only keeps crawlers from wasting requests on redirects to /signin.
 */
const robots = (): MetadataRoute.Robots => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://healthflowbd.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Account screens: nothing to index, and reset links carry tokens.
        "/signin",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/auth/",
        // The four panels.
        "/patient",
        "/portal",
        "/admin",
        "/super",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
};

export default robots;
