import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lets a local production build (NEXT_DIST_DIR=.next-build) run without clobbering `npm run dev`
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
