import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://healthflowbd.com";
  
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/signin",
        "/signup",
        "/patient/",
        "/portal/",
        "/admin/",
        "/super/",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
