import path from "path";
import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoBasePath = "/AI-fun-projects";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? repoBasePath : undefined,
  assetPrefix: isGithubPages ? repoBasePath : undefined,
  trailingSlash: isGithubPages,
  images: { unoptimized: true },
  serverExternalPackages: ["sql.js"],
  turbopack: {
    root: path.join(__dirname),
    resolveAlias: {
      fs: "./lib/empty.js",
      path: "./lib/empty.js",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? repoBasePath : "",
  },
};

export default nextConfig;
