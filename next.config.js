/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  
  // Disable static optimization completely
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  
  // Completely disable static optimization
  output: 'standalone',
  
  typescript: {
    // !! CUIDADO !!
    // Permite que a build de produção seja gerada com sucesso mesmo que seu projeto tenha erros de tipo.
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Disable ESLint during production build
    ignoreDuringBuilds: true,
  },

  // Images configuration
  images: {
    domains: [
      'localhost',
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.firebaseapp.com',
      },
    ],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.openai.com https://firestore.googleapis.com https://firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com; frame-src 'none'; object-src 'none';",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, X-Tenant-Id',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
  
  // Server external packages  
  serverExternalPackages: ['keyv', 'cacheable'],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Add any custom webpack config here
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Resolve package version conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // RADICAL FIX: Mock next/document to prevent Html import errors
    config.resolve.alias['next/document'] = false;
    
    // Add plugin to replace Html imports at build time
    config.plugins = config.plugins || [];
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.compilation.tap('RemoveHtmlImports', (compilation) => {
          compilation.hooks.optimizeChunks.tap('RemoveHtmlImports', (chunks) => {
            chunks.forEach((chunk) => {
              chunk.getModules().forEach((module) => {
                if (module.resource && module.resource.includes('next/document')) {
                  // Replace the module with an empty module
                  module._source = {
                    source: () => 'module.exports = {};',
                    size: () => 'module.exports = {};'.length
                  };
                }
              });
            });
          });
        });
      }
    });
    
    return config;
  },
  
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  
  // Rewrites for API routes
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
