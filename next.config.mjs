/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf.js utilise un worker — on le copie dans le dossier public
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
