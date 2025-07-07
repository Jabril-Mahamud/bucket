import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Externalize @supabase/realtime-js for server-side rendering
    if (isServer) {
      config.externals.push({
        "@supabase/realtime-js": "commonjs @supabase/realtime-js",
      });
    }
    
    return config;
  },
  // Experimental: Configure edge runtime externals
  experimental: {
    serverComponentsExternalPackages: ['@supabase/realtime-js'],
  },
};

export default nextConfig;