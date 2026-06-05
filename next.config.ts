import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // The dashboard lives at /v2. The legacy V1 root page was moved out of
  // routing, so / has no page → 404. Redirect root traffic to /v2.
  async redirects() {
    return [
      {
        source: "/",
        destination: "/v2",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
