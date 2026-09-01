import { NextResponse } from "next/server";

import {
  authorizeMediaGatewayRequest,
  constantTimeStringEqual,
  type MediaGatewayCredentialPayload,
} from "@/lib/media/range-gateway";
import { getMediaGatewayConfig } from "@/lib/media/range-gateway-config";
import { getRoomMediaGatewayAccess } from "@/lib/media/room-media-sessions";

const maximumBodyBytes = 4_096;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("Content-Length") ?? 0);

    if (Number.isFinite(contentLength) && contentLength > maximumBodyBytes) {
      return privateJson(
        { error: "Invalid media authorization request." },
        400,
      );
    }

    const config = getMediaGatewayConfig();
    const originSecret = readBearerToken(request.headers.get("Authorization"));

    if (
      !originSecret ||
      !constantTimeStringEqual(originSecret, config.originSecret)
    ) {
      return privateJson({ error: "Media access is not allowed." }, 401);
    }

    const payload = (await readBoundedJson(request)) as {
      credential?: unknown;
      sessionId?: unknown;
    } | null;

    if (
      !payload ||
      typeof payload.credential !== "string" ||
      payload.credential.length > maximumBodyBytes ||
      typeof payload.sessionId !== "string" ||
      !payload.sessionId ||
      payload.sessionId.length > 200
    ) {
      return privateJson(
        { error: "Invalid media authorization request." },
        400,
      );
    }

    const authorization = await authorizeMediaGatewayRequest({
      credential: payload.credential,
      expectedOriginSecret: config.originSecret,
      loadAccess: loadCurrentAccess,
      originSecret,
      sessionId: payload.sessionId,
      signingSecret: config.signingSecret,
    });

    if (!authorization.allowed) {
      return privateJson(
        { error: "Media access is not allowed." },
        authorization.status,
      );
    }

    return privateJson({
      contentType: authorization.contentType,
      objectKey: authorization.objectKey,
    });
  } catch (error) {
    console.error("[media-range-authorize] authorization failed", error);

    return privateJson({ error: "Media authorization is unavailable." }, 503);
  }
}

async function readBoundedJson(request: Request) {
  const reader = request.body?.getReader();

  if (!reader) {
    return null;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maximumBodyBytes) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

async function loadCurrentAccess(
  identity: Pick<
    MediaGatewayCredentialPayload,
    "memberId" | "roomId" | "sessionId"
  >,
) {
  const access = await getRoomMediaGatewayAccess(identity);
  const objectKey =
    access.asset?.processed_object_key ?? access.asset?.r2_object_key;

  if (!access.decision.allowed || !access.asset || !objectKey) {
    return { allowed: false as const };
  }

  return {
    allowed: true as const,
    contentType: access.asset.mime_type,
    objectKey,
  };
}

function readBearerToken(value: string | null) {
  const match = /^Bearer\s+(.+)$/i.exec(value?.trim() ?? "");

  return match?.[1]?.trim() ?? "";
}

function privateJson(body: object, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
    status,
  });
}
