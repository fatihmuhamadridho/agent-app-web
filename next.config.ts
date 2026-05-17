import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  devIndicators: false,
  env: {
    APP_VERSION: process.env.npm_package_version,
    BASE_API_URL: process.env.BASE_API_URL,
  },
};

export default nextConfig;
