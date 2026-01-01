/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'instagram.fsvq5-1.fna.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',
      },
    ],
  },
}

module.exports = nextConfig
