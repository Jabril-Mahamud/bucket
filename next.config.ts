import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle @supabase/realtime-js for both server and edge environments
    config.externals.push({
      "@supabase/realtime-js": "commonjs @supabase/realtime-js",
    });

    // Additional external packages that might cause issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "@supabase/realtime-js": false,
        "ws": false,
        "encoding": false,
      };
    }

    return config;
  },
  
  // Keep these for better compatibility
  serverExternalPackages: [
    '@supabase/realtime-js',
    '@aws-sdk/client-polly',
    'cloudconvert'
  ],
  
  experimental: {
    serverComponentsExternalPackages: [
      '@supabase/realtime-js',
      '@aws-sdk/client-polly', 
      'cloudconvert'
    ],
  },
};

export default nextConfig;