/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enforce standalone build compilation
  output: 'standalone',
  
  // Disable source maps in production to limit output size
  productionBrowserSourceMaps: false,
  
  // Silence Turbopack warning when using custom webpack config in Next.js 16
  turbopack: {},
  
  experimental: {
    // Prevent Next.js from loading entire index bundles for heavy libraries
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion'
    ]
  },
  
  webpack: (config, { isServer }) => {
    // PROTECT BROWSER CLIENT: Block Node modules from leaking into front-end bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        buffer: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    
    // Aggressive dead code elimination and tree-shaking
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: true,
      minimize: true,
    };
    
    return config;
  }
};

// INITIALIZE EDGE PLATFORM BRIDGE: Wire up local environment mock hooks for development
if (process.env.NODE_ENV !== "production") {
  try {
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    initOpenNextCloudflareForDev();
  } catch (e) {
    // Graceful fallback if @opennextjs/cloudflare is not yet installed in local workspace
    console.warn("OpenNext Cloudflare developer bridge not initialized (package not found):", e.message);
  }
}

export default nextConfig;
