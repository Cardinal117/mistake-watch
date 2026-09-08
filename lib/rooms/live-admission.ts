import "server-only";

import { randomBytes } from "node:crypto";

import { DbConnection } from "@/lib/spacetime/generated";
import { getSpacetimeConfig } from "@/lib/spacetime/config";
import { resolveRoomMembership, type AdmissionMember } from "./membership";

const ADMISSION_TTL_MS = 60_000;
const ADMISSION_TIMEOUT_MS = 5_000;
const TOKEN_BYTES = 32;

type AdmissionGrantReducers = {
  issueRoomAdmissionGrant(params: {
    admissionId: string;
    admissionToken: string;
    authorizationKind: AdmissionMember["authorizationKind"];
    expiresMs: bigint;
    identityHex: string;
    memberId: string;
    role: AdmissionMember["role"];
    roomId: string;
  }): Promise<void> | void;
};

export class LiveAdmissionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LiveAdmissionError";
  }
}

export async function createLiveRoomAdmission(input: {
  identityHex: string;
  roomId: string;
}) {
  const identityHex = input.identityHex.trim().toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(identityHex)) {
    throw new LiveAdmissionError("Invalid live connection identity.", 400);
  }

  const member = await resolveRoomMembership(input.roomId);

  if (!member) {
    throw new LiveAdmissionError("Active room membership is required.", 403);
  }

  const serverToken = process.env.SPACETIME_SERVER_AUTH_TOKEN?.trim();

  if (!serverToken) {
    throw new LiveAdmissionError("Live room admission is not configured.", 503);
  }

  const admissionId = randomBytes(18).toString("base64url");
  const admissionToken = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = Date.now() + ADMISSION_TTL_MS;

  await issueAdmissionGrant({
    admissionId,
    admissionToken,
    expiresMs: BigInt(expiresAt),
    identityHex,
    member,
    roomId: input.roomId,
    serverToken,
  });

  return { admissionId, admissionToken, expiresAt };
}

async function issueAdmissionGrant(input: {
  admissionId: string;
  admissionToken: string;
  expiresMs: bigint;
  identityHex: string;
  member: AdmissionMember;
  roomId: string;
  serverToken: string;
}) {
  const config = getSpacetimeConfig();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let connection: { disconnect(): void } | undefined;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      connection?.disconnect();
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(
      () => finish(new Error("Timed out while issuing live admission.")),
      ADMISSION_TIMEOUT_MS,
    );

    connection = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(input.serverToken)
      .onConnect((connected) => {
        void Promise.resolve(
          (
            connected.reducers as unknown as AdmissionGrantReducers
          ).issueRoomAdmissionGrant({
            admissionId: input.admissionId,
            admissionToken: input.admissionToken,
            authorizationKind: input.member.authorizationKind,
            expiresMs: input.expiresMs,
            identityHex: input.identityHex,
            memberId: input.member.memberId,
            role: input.member.role,
            roomId: input.roomId,
          }),
        ).then(() => finish(), finish);
      })
      .onConnectError(finish)
      .onDisconnect(() =>
        finish(new Error("Disconnected while issuing live admission.")),
      )
      .build();
  });
}
