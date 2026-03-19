/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  webpack: (config) => {
    config.externals = [...(config.externals || []), { undici: "undici" }];
    return config;
  },
};

module.exports = nextConfig;