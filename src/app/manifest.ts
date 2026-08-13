import { MetadataRoute } from "next";
import { BRAND_INFO } from "@/constants/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_INFO.name,
    short_name: BRAND_INFO.name,
    description: BRAND_INFO.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981", // Emerald-500 primary color
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
