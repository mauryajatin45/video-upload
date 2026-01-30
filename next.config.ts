import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for video uploads (60MB to allow some overhead)
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb',
    },
  },
  // Redirect root to upload page
  async redirects() {
    return [
      {
        source: '/',
        destination: '/upload',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
