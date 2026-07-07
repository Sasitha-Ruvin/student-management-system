import type { Metadata } from "next";
import type { MetadataRoute } from "next";

/** Applied in root layout metadata — keeps HTML out of search indexes. */
export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

/** Served at /robots.txt — blocks all crawlers from the admin portal. */
export function portalRobots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
