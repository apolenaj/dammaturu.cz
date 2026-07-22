import type { MetadataRoute } from "next";
import {
  absoluteUrl,
  listPublicSitemapPaths,
  shouldNoIndexDeployment,
} from "@/lib/seo";

/**
 * Sitemap = real public pages only.
 * Preview deployments return empty (robots already disallow all).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (shouldNoIndexDeployment()) {
    return [];
  }

  const now = new Date();
  return listPublicSitemapPaths().map((path) => {
    const isHome = path === "/";
    const isLearning = path.startsWith("/priprava");
    return {
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: isHome ? "weekly" : isLearning ? "monthly" : "monthly",
      priority: isHome ? 1 : path === "/priprava" ? 0.9 : isLearning ? 0.8 : 0.7,
    };
  });
}
