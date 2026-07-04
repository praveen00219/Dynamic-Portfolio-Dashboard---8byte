import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A stray package-lock.json in the user profile makes Next guess the wrong workspace root; pin it to this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;