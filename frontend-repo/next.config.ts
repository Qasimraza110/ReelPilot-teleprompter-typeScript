import withPWA from "next-pwa";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "pcw04dvz-3000.asse.devtunnels.ms"],
    },
  },

  // Your existing Next.js config options here
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "**", // allow all paths
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true, // Disable PWA in development
  disable: process.env.NODE_ENV === "development",
  swSrc: "./public/sync-queue-sw.js", // This tells Workbox to use your file as the base
})(nextConfig as import('next-pwa').WithPWA);
