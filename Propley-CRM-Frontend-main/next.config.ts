import type { NextConfig } from "next";

const mandakeSlidesOrigin =
  process.env.MANDAKE_SLIDES_URL?.replace(/\/$/, "") ??
  "https://mandake.vercel.app";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.9",
    "localhost:3000",
    "localhost:3001",
    "gasoline-person-phrase-command.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
  async rewrites() {
    return [
      {
        source: "/mandake-slides/:path*",
        destination: `${mandakeSlidesOrigin}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
