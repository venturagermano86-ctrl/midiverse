/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    // Keep native / ws deps out of the webpack bundle (fixes msedge-tts in App Router)
    serverComponentsExternalPackages: [
      "msedge-tts",
      "ws",
      "bufferutil",
      "utf-8-validate",
      "ffmpeg-static",
    ],
  },
};

export default nextConfig;
