/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // Disable source maps in production to limit output size
  productionBrowserSourceMaps: false,
  
  // Silence Turbopack warning when using custom webpack config in Next.js 16
  turbopack: {},
  
  serverExternalPackages: ['pdfjs-dist'],
  
  experimental: {
    // Prevent Next.js from loading entire index bundles for heavy libraries
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion'
    ]
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' https: wss:; frame-src 'self' https://www.youtube.com https://codesandbox.io;"
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN' // Allows framing only on the same domain
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Mitigates MIME-type sniffing XSS
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin' // Limits Referer header for privacy/CSRF
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()' // Blocks unused APIs
          }
        ]
      }
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
        canvas: false,
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

export default nextConfig;
