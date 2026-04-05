/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
  output: 'standalone',
};

export default nextConfig;
