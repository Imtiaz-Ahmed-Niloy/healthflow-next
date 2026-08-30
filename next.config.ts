import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets `NEXT_DIST_DIR=.next-verify yarn build` run without clobbering the
  // .next a running `yarn dev` is serving from. Defaults to the usual .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
