import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Excludes /api/v1/**, the deliberately public API — framing/sniffing
        // protections make sense for pages, not for a JSON endpoint meant to
        // be fetched cross-origin by other services.
        source: "/((?!api/v1).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
