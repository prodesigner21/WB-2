/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server-side packages that should not be bundled for the client
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin', 'nodemailer'],
  },
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
}

module.exports = nextConfig
