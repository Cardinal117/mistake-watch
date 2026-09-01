import "server-only";

const minimumSecretLength = 32;

export type MediaGatewayConfig = {
  cookieDomain: string;
  gatewayOrigin: string;
  originSecret: string;
  signingSecret: string;
};

export function getMediaGatewayConfig(): MediaGatewayConfig {
  const gatewayOrigin = readRequiredEnv("MEDIA_GATEWAY_ORIGIN");
  const cookieDomain = readRequiredEnv("MEDIA_GATEWAY_COOKIE_DOMAIN");
  const signingSecret = readRequiredSecret("MEDIA_GATEWAY_SIGNING_SECRET");
  const originSecret = readRequiredSecret("MEDIA_GATEWAY_ORIGIN_SECRET");
  const origin = new URL(gatewayOrigin);
  const normalizedDomain = cookieDomain.replace(/^\./, "").toLowerCase();

  if (
    origin.hostname !== normalizedDomain &&
    !origin.hostname.endsWith(`.${normalizedDomain}`)
  ) {
    throw new Error(
      "MEDIA_GATEWAY_ORIGIN must be hosted within MEDIA_GATEWAY_COOKIE_DOMAIN.",
    );
  }

  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") {
    throw new Error("MEDIA_GATEWAY_ORIGIN must use HTTPS in production.");
  }

  return {
    cookieDomain: normalizedDomain,
    gatewayOrigin: origin.origin,
    originSecret,
    signingSecret,
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
