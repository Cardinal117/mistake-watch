export function nowMs() {
  return BigInt(Date.now());
}

export function participantKey(roomId: string, memberId: string) {
  return `${roomId}:${memberId}`;
}

export function participantSessionKey(
  roomId: string,
  memberId: string,
  identityHex: string,
) {
  return `${roomId}:${memberId}:${identityHex}`;
}

export function kickKey(roomId: string, memberId: string) {
  return `${roomId}:${memberId}`;
}

export function permissionKey(roomId: string, memberId: string) {
  return `${roomId}:${memberId}`;
}

export function roomSeedGrantKey(roomId: string, hostMemberId: string) {
  return `${roomId}:${hostMemberId}`;
}

export function constantTimeStringEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return diff === 0;
}
