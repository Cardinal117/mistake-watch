/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
        source: "/avatars/:path*",
      },
      {
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
        source: "/api/youtube/metadata",
      },
      {
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=1200, stale-while-revalidate=3600",
          },
        ],
        source: "/api/youtube/playlist",
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
