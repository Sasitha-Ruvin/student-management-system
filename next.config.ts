import type { NextConfig } from "next";

import {
  API_SECURITY_HEADERS,
  BASE_SECURITY_HEADERS,
} from "@/lib/security/security-headers";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [...API_SECURITY_HEADERS],
      },
      {
        source: "/:path*",
        headers: [...BASE_SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;
