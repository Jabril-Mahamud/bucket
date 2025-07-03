import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        "@supabase/realtime-js": "commonjs @supabase/realtime-js",
      });
    }
    return config;
  },
};

export default nextConfig;
