import type { MetadataRoute } from "next";

import { portalRobots } from "@/lib/security/robots";

export default function robots(): MetadataRoute.Robots {
  return portalRobots();
}
