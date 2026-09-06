import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Canonical host is the apex. www is attached to the project only so it
        // doesn't 404; every request to it 308s to https://postpilot.xyz.
        source: "/:path*",
        has: [{ type: "host", value: "www.postpilot.xyz" }],
        destination: "https://postpilot.xyz/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
