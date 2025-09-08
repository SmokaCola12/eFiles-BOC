/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: [
      '172.17.40.138',
      '172.17.40.138:3000',
      'localhost',
      '127.0.0.1',
      '*.local'
    ]
  }
}

export default nextConfig
