/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["api.telegram.org", "localhost", "127.0.0.1"]
  }
};

module.exports = nextConfig;
