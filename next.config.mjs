import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default withBundleAnalyzer(nextConfig);
