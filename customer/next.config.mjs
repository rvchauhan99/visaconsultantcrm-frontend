import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
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
