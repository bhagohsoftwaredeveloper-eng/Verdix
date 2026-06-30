import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Tugoti ang separate dist dir (env-driven) aron ang e2e test server makasabay
  // sa usa ka running nga dev server (lahi ang Next dev singleton lock). Default
  // gihapon '.next' kung walay env — walay kausaban sa normal nga dev/build.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  // Keep heavy, non-runtime folders out of the standalone trace. Without this
  // Next copies these multi-GB folders into .next/standalone, bloating it to
  // 30GB+ and causing the installer to silently fail copying node_modules/next.
  outputFileTracingExcludes: {
    '*': [
      'backups/**',
      'vendor/**',
      'mysql-bundle/**',
      'dist/**',
      'Output/**',
      'temp_docs/**',
      'scratch/**',
      'playwright-report/**',
      'tests/**',
      'license-server/**',
      '**/*.sql',
      '**/*.log',
      '**/*.pdf',
    ],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },


  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};


export default nextConfig;
// Forced update
