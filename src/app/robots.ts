import type { MetadataRoute } from "next";
import {
  getSiteUrl,
  shouldNoIndexDeployment,
} from "@/lib/seo";

/**
 * Disallow private surfaces. On Vercel preview / non-production, disallow all
 * so temporary URLs are not indexed when a production canonical exists.
 */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  if (shouldNoIndexDeployment()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: site.replace(/^https?:\/\//, ""),
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/admin/",
          "/onboarding",
          "/auth/",
          "/design-system",
          "/offline",
          "/api/",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site.replace(/^https?:\/\//, ""),
  };
}
