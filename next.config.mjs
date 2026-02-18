/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
