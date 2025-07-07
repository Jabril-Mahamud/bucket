import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle @supabase/realtime-js for both server and edge environments
    config.externals.push({
      "@supabase/realtime-js": "commonjs @supabase/realtime-js",
    });

    // Additional fix for edge runtime
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "@supabase/realtime-js": false,
      };
    }

    return config;
  },
  serverExternalPackages: ['@supabase/realtime-js'],
  experimental: {
    // Ensure edge runtime compatibility
    serverComponentsExternalPackages: ['@supabase/realtime-js'],
  },
};

export default nextConfig;