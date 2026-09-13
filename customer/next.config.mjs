import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-7d26117b0d324171b7f84802d8e15965.r2.dev" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  webpack: (config) => {
    config.resolve.alias["@passage/ui"] = path.resolve(__dirname, "../packages/ui");
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@passage/ui": path.resolve(__dirname, "../packages/ui"),
    },
  },
};

export default nextConfig;
