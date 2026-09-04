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
  async rewrites() {
    const upstreamOrigin = readMediaGatewayUpstreamOrigin();

    if (!upstreamOrigin) {
      return [];
    }

    return [
      {
        destination: `${upstreamOrigin}/room-sessions/:sessionId/content`,
        source: "/media-gateway/room-sessions/:sessionId/content",
      },
    ];
  },
  reactStrictMode: true,
};

function readMediaGatewayUpstreamOrigin() {
  const value = process.env.MEDIA_GATEWAY_UPSTREAM_ORIGIN?.trim();

  if (!value) {
    return null;
  }

  const url = new URL(value);

  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "MEDIA_GATEWAY_UPSTREAM_ORIGIN must contain only an origin.",
    );
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error(
      "MEDIA_GATEWAY_UPSTREAM_ORIGIN must use HTTPS in production.",
    );
  }

  return url.origin;
}

export default nextConfig;
