import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
