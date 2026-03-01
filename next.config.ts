import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@schedule-x/calendar",
    "@schedule-x/react",
    "@schedule-x/events-service",
    "@schedule-x/theme-default",
  ],
};

export default nextConfig;
