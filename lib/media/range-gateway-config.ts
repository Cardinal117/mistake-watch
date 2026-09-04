import "server-only";

const minimumSecretLength = 32;

export type MediaGatewayConfig = {
  originSecret: string;
  signingSecret: string;
  upstreamOrigin: string;
};

export function getMediaGatewayConfig(): MediaGatewayConfig {
  const upstreamOrigin = readRequiredEnv("MEDIA_GATEWAY_UPSTREAM_ORIGIN");
  const signingSecret = readRequiredSecret("MEDIA_GATEWAY_SIGNING_SECRET");
  const originSecret = readRequiredSecret("MEDIA_GATEWAY_ORIGIN_SECRET");
  const origin = new URL(upstreamOrigin);

  if (
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  ) {
    throw new Error(
      "MEDIA_GATEWAY_UPSTREAM_ORIGIN must contain only an origin.",
    );
  }

  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") {
    throw new Error(
      "MEDIA_GATEWAY_UPSTREAM_ORIGIN must use HTTPS in production.",
    );
  }

  return {
    originSecret,
    signingSecret,
    upstreamOrigin: origin.origin,
  };
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function readRequiredSecret(name: string) {
  const value = readRequiredEnv(name);

  if (value.length < minimumSecretLength) {
    throw new Error(
      `${name} must be at least ${minimumSecretLength} characters.`,
    );
  }

  return value;
}
