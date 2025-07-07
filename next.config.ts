import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push({
      "@supabase/realtime-js": "commonjs @supabase/realtime-js",
    });
    return config;
  },
  serverExternalPackages: ['@supabase/realtime-js'],
};

export default nextConfig;