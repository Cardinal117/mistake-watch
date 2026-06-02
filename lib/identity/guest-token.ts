import "server-only";

import { createHash, randomBytes } from "node:crypto";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_DISPLAY_NAME_LENGTH = 80;
const MIN_DISPLAY_NAME_LENGTH = 1;

export type GuestTokenBundle = {
  cookieName: string;
  token: string;
  tokenHash: string;
};

export function normalizeDisplayName(displayName: string) {
  const normalized = displayName.trim().replace(/\s+/g, " ");

  if (
    normalized.length < MIN_DISPLAY_NAME_LENGTH ||
    normalized.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    throw new Error("Display name must be between 1 and 80 characters.");
  }

  return normalized;
}

export function createOpaqueToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function createInviteCode() {
  const bytes = randomBytes(8);
  const code = Array.from(
    bytes,
    (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length],
  )
    .join("")
    .match(/.{1,4}/g)
    ?.join("-");

  return code ?? createOpaqueToken(6).toUpperCase();
}

export function hashInviteToken(token: string) {
  return sha256(`mistake-watch:invite:${token}`);
}

export function hashRoomScopedToken(roomId: string, token: string) {
  return sha256(`mistake-watch:room:${roomId}:${token}`);
}

export function getGuestIdentityCookieName(roomId: string) {
  return `mw_guest_${roomId}`;
}

export function createGuestTokenBundle(roomId: string): GuestTokenBundle {
  const token = createOpaqueToken();

  return {
    cookieName: getGuestIdentityCookieName(roomId),
    token,
    tokenHash: hashRoomScopedToken(roomId, token),
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
