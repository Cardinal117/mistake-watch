export type LiveRoomAdmission = {
  admissionId: string;
  admissionToken: string;
  expiresAt: number;
};

export function hasLiveRoomAdmission(input: {
  admissionId: string | null;
  memberId?: string | null;
  presences: Array<{
    admissionId: string;
    memberId: string;
    status: "idle" | "online";
  }>;
}) {
  return Boolean(
    input.admissionId &&
      input.memberId &&
      input.presences.some(
        (presence) =>
          presence.admissionId === input.admissionId &&
          presence.memberId === input.memberId &&
          presence.status === "online",
      ),
  );
}

export async function requestLiveRoomAdmission(input: {
  identityHex: string;
  roomId: string;
}): Promise<LiveRoomAdmission> {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(input.roomId)}/live-admission`,
    {
      body: JSON.stringify({ identityHex: input.identityHex }),
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const payload = (await response.json()) as Partial<LiveRoomAdmission> & {
    error?: string;
  };

  if (
    !response.ok ||
    typeof payload.admissionId !== "string" ||
    typeof payload.admissionToken !== "string" ||
    typeof payload.expiresAt !== "number"
  ) {
    throw new Error(payload.error ?? "Live room admission failed.");
  }

  return {
    admissionId: payload.admissionId,
    admissionToken: payload.admissionToken,
    expiresAt: payload.expiresAt,
  };
}

export function readSpacetimeIdentityHex(identity: unknown) {
  const value = identity as { toHexString?: () => string };
  const identityHex = value.toHexString?.().trim().toLowerCase() ?? "";

  if (!/^[0-9a-f]{64}$/.test(identityHex)) {
    throw new Error("SpacetimeDB returned an invalid connection identity.");
  }

  return identityHex;
}
