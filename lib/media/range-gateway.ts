import crypto from "node:crypto";

const credentialVersion = 1;

export const mediaGatewayCookieName = "__Secure-mw_media_access";

export type MediaGatewayCredentialPayload = {
  expiresAt: number;
  memberId: string;
  roomId: string;
  sessionId: string;
  tokenId: string;
  version: typeof credentialVersion;
};

type MediaGatewayAccess =
  | {
      allowed: true;
      contentType: string | null;
      objectKey: string;
    }
  | {
      allowed: false;
    };

export function createMediaGatewayCredential(input: {
  payload: Omit<MediaGatewayCredentialPayload, "version">;
  secret: string;
}) {
  const payload: MediaGatewayCredentialPayload = {
    ...input.payload,
    version: credentialVersion,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signCredential(encodedPayload, input.secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyMediaGatewayCredential(input: {
  credential: string;
  now?: Date;
  secret: string;
}): MediaGatewayCredentialPayload | null {
  const parts = input.credential.split(".");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = signCredential(encodedPayload, input.secret);

  if (!constantTimeStringEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;

    if (!isCredentialPayload(parsed)) {
      return null;
    }

    if (parsed.expiresAt <= (input.now ?? new Date()).getTime()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function authorizeMediaGatewayRequest(input: {
  credential: string;
  expectedOriginSecret: string;
  loadAccess: (identity: {
    memberId: string;
    roomId: string;
    sessionId: string;
  }) => Promise<MediaGatewayAccess>;
  now?: Date;
  originSecret: string;
  sessionId: string;
  signingSecret: string;
}) {
  if (
    !input.originSecret ||
    !constantTimeStringEqual(input.originSecret, input.expectedOriginSecret)
  ) {
    return { allowed: false as const, status: 401 };
  }

  const credential = verifyMediaGatewayCredential({
    credential: input.credential,
    now: input.now,
    secret: input.signingSecret,
  });

  if (!credential || credential.sessionId !== input.sessionId) {
    return { allowed: false as const, status: 403 };
  }

  const access = await input.loadAccess({
    memberId: credential.memberId,
    roomId: credential.roomId,
    sessionId: credential.sessionId,
  });

  if (!access.allowed) {
    return { allowed: false as const, status: 403 };
  }

  return access;
}

export function createMediaGatewayBootstrap(input: {
  cookieDomain: string;
  expiresAt: Date;
  gatewayOrigin: string;
  memberId: string;
  roomId: string;
  sessionId: string;
  signingSecret: string;
  tokenId: string;
}) {
  const credential = createMediaGatewayCredential({
    payload: {
      expiresAt: input.expiresAt.getTime(),
      memberId: input.memberId,
      roomId: input.roomId,
      sessionId: input.sessionId,
      tokenId: input.tokenId,
    },
    secret: input.signingSecret,
  });

  return {
    cookie: {
      domain: input.cookieDomain,
      expires: input.expiresAt,
      httpOnly: true as const,
      name: mediaGatewayCookieName,
      path: getMediaGatewayCookiePath(input.sessionId),
      sameSite: "strict" as const,
      secure: true as const,
      value: credential,
    },
    playbackUrl: buildMediaGatewayPlaybackUrl({
      origin: input.gatewayOrigin,
      sessionId: input.sessionId,
    }),
  };
}

export function buildMediaGatewayPlaybackUrl(input: {
  origin: string;
  sessionId: string;
}) {
  const url = new URL(input.origin);

  url.pathname = getMediaGatewayCookiePath(input.sessionId);
  url.search = "";
  url.hash = "";

  return url.toString();
}

export function getMediaGatewayCookiePath(sessionId: string) {
  return `/room-sessions/${encodeURIComponent(sessionId)}/content`;
}

export function constantTimeStringEqual(left: string, right: string) {
  const leftDigest = crypto.createHash("sha256").update(left).digest();
  const rightDigest = crypto.createHash("sha256").update(right).digest();

  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function signCredential(payload: string, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

function isCredentialPayload(
  value: unknown,
): value is MediaGatewayCredentialPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    payload.version === credentialVersion &&
    Number.isSafeInteger(payload.expiresAt) &&
    isBoundedIdentifier(payload.memberId) &&
    isBoundedIdentifier(payload.roomId) &&
    isBoundedIdentifier(payload.sessionId) &&
    isBoundedIdentifier(payload.tokenId)
  );
}

function isBoundedIdentifier(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}
