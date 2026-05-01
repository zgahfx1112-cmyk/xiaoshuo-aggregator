import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.qidian.com',
      },
      {
        protocol: 'https',
        hostname: '**.qidian.com',
      },
      {
        protocol: 'https',
        hostname: '**.zongheng.com',
      },
      {
        protocol: 'https',
        hostname: '**.jjwxc.net',
      },
      {
        protocol: 'https',
        hostname: 'img.zongheng.com',
      },
      {
        protocol: 'https',
        hostname: 'img.jjwxc.net',
      },
      {
        protocol: 'https',
        hostname: 'img.fanqienovel.com',
      },
    ],
  },
};

export default nextConfig;