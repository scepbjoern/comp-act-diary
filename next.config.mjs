import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('./package.json')

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Phase 9: Standalone output for smaller Docker images
  output: 'standalone',
  
  eslint: {
    // Skip linting during production build to avoid OOM in Docker (exit code 137)
    // Run `npm run lint` separately in CI/CD or locally before deployment
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  
  // Phase 9: Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Phase 9: Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer: _isServer }) => {
    // Together-AI hat eine optionale parquetjs-Dependency für File-Uploads
    // Da wir nur Chat/Audio nutzen, können wir diese ignorieren
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^parquetjs$/,
        contextRegExp: /together-ai/,
      })
    )
    return config
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
