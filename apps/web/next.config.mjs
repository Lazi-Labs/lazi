/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/dashboard',
  assetPrefix: '/dashboard',
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Skip build-time data fetching errors
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Skip static generation for dashboard pages that require authentication
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
