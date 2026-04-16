import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    poweredByHeader: false,
    experimental: {
        optimizePackageImports: ["date-fns"],
    },
};

export default nextConfig;
